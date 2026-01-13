export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  supplier?: string;
  supplierRef?: string;
}) {
  if (!supplier || !supplierRef) {
    console.log("ℹ️ [SUPPLIER LINK] skipped (missing supplier or ref)");
    return;
  }

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🟢 [PRODUCT UPDATE] route hit");

    const { id: productId } = await params;

    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const body = await req.json();

    let inventory_count: number | undefined;
    if (typeof body.inventory_count === "number") {
      if (body.inventory_count < 0) {
        return NextResponse.json(
          { error: "Inventory cannot be negative" },
          { status: 400 }
        );
      }
      inventory_count = body.inventory_count;
    }

    const updateData: Record<string, unknown> = {};

    const allowed = [
      "name",
      "display_title",
      "description",
      "supplier_price",
      "markup_percent",
      "price",
      "image_url",
      "author_id",
      "format",
      "language",
      "genre_id",
      "vibe_id",
      "theme_id",
      "fulfilment_mode",
      "out_of_stock_behavior",
      "commercial_model",
      "supply_source",
      "consignment_split_percent",
      "consignment_notes",
    ] as const;

    for (const key of allowed) {
      if (body[key] === "") {
        updateData[key] = null;
      } else if (body[key] !== undefined) {
        if (
          key === "price" ||
          key === "supplier_price" ||
          key === "markup_percent"
        ) {
          const num = Number(body[key]);
          if (Number.isNaN(num)) {
            return NextResponse.json(
              { error: `Invalid numeric value for ${key}` },
              { status: 400 }
            );
          }
          updateData[key] = num;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    console.log("🟢 [PRODUCT UPDATE] updateData:", updateData);

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId);

      if (error) {
        return NextResponse.json(
          { error: "Product update failed", detail: error },
          { status: 500 }
        );
      }
    }

  

    if (typeof inventory_count === "number") {
  const { error } = await supabase.rpc("adjust_product_inventory", {
    p_product_id: productId,
    p_new_quantity: inventory_count,
    p_reason: "admin_adjustment",
    p_user_id: auth.user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Inventory update failed", detail: error },
      { status: 500 }
    );
  }
}


    await upsertProductSupplier({
      supabase,
      productId,
      supplier: body.supplier,
      supplierRef: body.supplier_ref,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ PRODUCT UPDATE FAILED", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
