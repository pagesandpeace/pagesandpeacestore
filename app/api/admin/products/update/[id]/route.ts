export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import cloudinary from "@/lib/cloudinary";

/* ------------------------------------------
   Helper: upsert supplier link (manual)
------------------------------------------ */
async function upsertProductSupplier({
  supabase,
  productId,
  supplier,
  supplierRef,
}: {
  supabase: SupabaseClient;
  productId: string;
  supplier?: string | null;
  supplierRef?: string | null;
}) {
  if (!supplier || !supplierRef) return;

  const { error } = await supabase
    .from("product_suppliers")
    .upsert(
      {
        product_id: productId,
        supplier,
        supplier_ref: supplierRef,
        confidence: "manual",
        active: true,
      },
      { onConflict: "product_id,supplier" }
    );

  if (error) {
    throw new Error(`Supplier link failed: ${error.message}`);
  }
}

/* ------------------------------------------
   Helper: fetch Gardners jacket → Cloudinary
------------------------------------------ */
async function fetchGardnersJacketToCloudinary(
  isbn13: string
): Promise<string | null> {
  const clean = isbn13.replace(/-/g, "");

  const candidates = [
    `https://jackets.dmmserver.com/media/640/${clean.slice(0, 8)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/640/${clean.slice(0, 7)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/356/${clean.slice(0, 8)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/356/${clean.slice(0, 7)}/${clean}.jpg`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());

      const upload = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString("base64")}`,
        {
          folder: "products/books",
          public_id: `isbn_${clean}`,
          overwrite: false,
          resource_type: "image",
        }
      );

      if (upload?.secure_url) {
        return upload.secure_url;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

/* ------------------------------------------
   ROUTE
------------------------------------------ */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json();

    /* ---------- USER CLIENT (RLS) ---------- */
    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* ---------- SERVICE ROLE CLIENT ---------- */
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* ---------- INVENTORY INPUT ---------- */
    let inventory_count: number | undefined;
    if (typeof body.inventory_count === "number") {
      inventory_count = body.inventory_count;
    }

    /* ---------- SAFE UPDATE FIELDS ---------- */
    const updateData: Record<string, unknown> = {};

    const allowed = [
      "name",
      "display_title",
      "description",

      "price",
      "rrp",

      "image_url",
      "isbn_13",

      // 🔑 AUTHOR (PARITY WITH CREATE)
      "author",
      "author_id",

      "format",
      "language",
      "genre_id",
      "vibe_id",
      "theme_id",

      "fulfilment_mode",
      "supply_source",
      "commercial_model",
      "out_of_stock_behavior",
    ] as const;

    for (const key of allowed) {
      if (body[key] === "") {
        updateData[key] = null;
      } else if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    /* ---------- RESOLVE AUTHOR SENTINEL ---------- */
    if (
      updateData.author === "__FROM_AUTHOR_ID__" &&
      typeof updateData.author_id === "string"
    ) {
      const { data: authorRow } = await supabase
        .from("authors")
        .select("name")
        .eq("id", updateData.author_id)
        .single();

      updateData.author = authorRow?.name ?? null;
    }

    /* ---------- WRITE PRODUCT ---------- */
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId);

      if (error) {
        return NextResponse.json(
          { error: "Product update failed" },
          { status: 500 }
        );
      }
    }

    /* ---------- AUTO-FETCH JACKET ---------- */
    if (
      typeof updateData.isbn_13 === "string" &&
      (!body.image_url || body.image_url.includes("Fallback"))
    ) {
      const cloudinaryUrl =
        await fetchGardnersJacketToCloudinary(updateData.isbn_13);

      if (cloudinaryUrl) {
        await supabase
          .from("products")
          .update({ image_url: cloudinaryUrl })
          .eq("id", productId);
      }
    }

    /* ---------- INVENTORY LEDGER ---------- */
    if (typeof inventory_count === "number") {
      await supabase.rpc("adjust_product_inventory", {
        p_product_id: productId,
        p_new_quantity: inventory_count,
        p_reason: "admin_adjustment",
        p_user_id: auth.user.id,
      });
    }

    /* ---------- SUPPLIER LINK (SERVICE ROLE) ---------- */
    await upsertProductSupplier({
      supabase: supabaseAdmin, // 🔑 FIX
      productId,
      supplier: body.supplier,
      supplierRef: body.supplier_ref,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
