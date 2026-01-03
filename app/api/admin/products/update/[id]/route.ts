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
      {
        onConflict: "product_id,supplier",
      }
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
    /* ------------------------------------
       PARAMS
    ------------------------------------ */
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f-]{36}$/i.test(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID format" },
        { status: 400 }
      );
    }

    /* ------------------------------------
       SUPABASE
    ------------------------------------ */
    const supabase = await supabaseServer();

    /* ------------------------------------
       AUTH
    ------------------------------------ */
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    /* ------------------------------------
       PROFILE / ROLE
    ------------------------------------ */
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

    /* ------------------------------------
       BODY
    ------------------------------------ */
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

    /* ------------------------------------
       UPDATE PRODUCT (SAFE FIELD LIST)
    ------------------------------------ */
    const updateData: Record<string, unknown> = {};

    const allowed = [
      "name",
      "display_title",
      "description",
      "price",
      "image_url",

      // book metadata
      "author_id",
      "format",
      "language",
      "genre_id",
      "vibe_id",
      "theme_id",

      // fulfilment + stock logic
      "fulfilment_mode",
      "out_of_stock_behavior",

      // commercial
      "commercial_model",
      "supply_source",
      "consignment_split_percent",
      "consignment_notes",
    ] as const;

    for (const key of allowed) {
      if (body[key] === "") {
        updateData[key] = null;
      } else if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: productError } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId);

      if (productError) {
        return NextResponse.json(
          { error: "Product update failed", detail: productError },
          { status: 500 }
        );
      }
    }

    /* ------------------------------------
       INVENTORY RULES (AUTHORITATIVE)
    ------------------------------------ */

    // If switching to made_to_order → inventory MUST be zero
    if (body.fulfilment_mode === "made_to_order") {
      const { error } = await supabase
        .from("products")
        .update({ inventory_count: 0 })
        .eq("id", productId);

      if (error) {
        return NextResponse.json(
          {
            error: "Failed to reset inventory for made-to-order",
            detail: error,
          },
          { status: 500 }
        );
      }
    }

    // Physical stock → adjust via RPC
    if (
      body.fulfilment_mode === "physical" &&
      typeof inventory_count === "number"
    ) {
      const { error: inventoryError } = await supabase.rpc(
        "adjust_product_inventory",
        {
          p_product_id: productId,
          p_new_quantity: inventory_count,
          p_reason: "admin_adjustment",
          p_user_id: auth.user.id,
        }
      );

      if (inventoryError) {
        return NextResponse.json(
          { error: "Inventory update failed", detail: inventoryError },
          { status: 500 }
        );
      }
    }

    /* ------------------------------------
       SUPPLIER LINK (OPTIONAL)
    ------------------------------------ */
    await upsertProductSupplier({
      supabase,
      productId,
      supplier: body.supplier,
      supplierRef: body.supplier_ref,
    });

    /* ------------------------------------
       DONE
    ------------------------------------ */
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ PRODUCT UPDATE FAILED", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
