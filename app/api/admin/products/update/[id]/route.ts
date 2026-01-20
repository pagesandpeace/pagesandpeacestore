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
  console.log("🟡 [SUPPLIER LINK] input:", { supplier, supplierRef });

  if (!supplier || !supplierRef) {
    console.log("🟡 [SUPPLIER LINK] skipped");
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

  console.log("🟢 [SUPPLIER LINK] upserted");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🟢 [PRODUCT UPDATE] ROUTE HIT");

    const { id: productId } = await params;
    console.log("🟢 [PRODUCT UPDATE] productId:", productId);

    const body = await req.json();
    console.log("🟢 [PRODUCT UPDATE] RAW BODY:", body);

    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    console.log("🟢 [PRODUCT UPDATE] auth:", auth?.user?.email);

    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    console.log("🟢 [PRODUCT UPDATE] role:", profile?.role);

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* ---------- INVENTORY ---------- */
    let inventory_count: number | undefined;
    if (typeof body.inventory_count === "number") {
      inventory_count = body.inventory_count;
    }

    /* ---------- BUILD UPDATE ---------- */
    const updateData: Record<string, unknown> = {};

    const allowed = [
      "name",
      "display_title",
      "description",
      "price",
      "supplier_price",
      "markup_percent",
      "image_url",

      // 👇 CRITICAL
      "isbn_13",

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

    console.log("🟢 [PRODUCT UPDATE] FINAL updateData:", updateData);

    /* ---------- WRITE ---------- */
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId);

      if (error) {
        console.error("🔴 UPDATE FAILED:", error);
        return NextResponse.json(
          { error: "Product update failed" },
          { status: 500 }
        );
      }
    } else {
      console.log("🟡 [PRODUCT UPDATE] nothing to update");
    }

    /* ---------- INVENTORY ---------- */
    if (typeof inventory_count === "number") {
      console.log("🟢 [INVENTORY] adjusting:", inventory_count);

      await supabase.rpc("adjust_product_inventory", {
        p_product_id: productId,
        p_new_quantity: inventory_count,
        p_reason: "admin_adjustment",
        p_user_id: auth.user.id,
      });
    }

    await upsertProductSupplier({
      supabase,
      productId,
      supplier: body.supplier,
      supplierRef: body.supplier_ref,
    });

    console.log("🟢 [PRODUCT UPDATE] DONE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 PRODUCT UPDATE CRASHED:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
