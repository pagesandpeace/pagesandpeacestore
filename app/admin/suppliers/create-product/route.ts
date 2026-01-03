export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       BODY
    ------------------------- */
    const {
      supplier,
      supplier_ref,
      supplier_import_batch_id,
      title,
      display_title,
      price,
      author_id,
    } = await req.json();

    if (!supplier || !supplier_ref || !supplier_import_batch_id) {
      return NextResponse.json(
        { error: "Missing supplier reference" },
        { status: 400 }
      );
    }

    /* -------------------------
       LOAD SUPPLIER ROW
    ------------------------- */
    const { data: supplierRow, error: supplierError } = await supabase
      .from("supplier_products")
      .select("*")
      .eq("supplier", supplier)
      .eq("supplier_ref", supplier_ref)
      .single();

    if (supplierError || !supplierRow) {
      return NextResponse.json(
        { error: "Supplier product not found" },
        { status: 404 }
      );
    }

    /* -------------------------
       CREATE PRODUCT
    ------------------------- */
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: title ?? supplierRow.title,
        display_title: display_title ?? supplierRow.display_title,
        product_type: "book",

        price: price ?? supplierRow.supplier_price,
        supplier_price: supplierRow.supplier_price,

        isbn_13: supplierRow.supplier_ref,
        format: supplierRow.binding,
        language: "English",

        fulfilment_mode: "made_to_order",
        supply_source: "supplier",
        commercial_model: "wholesale",

        author_id: author_id ?? null,
      })
      .select()
      .single();

    if (productError) throw productError;

    /* -------------------------
       LINK SUPPLIER
    ------------------------- */
    const { error: linkError } = await supabase
      .from("product_supplier_links")
      .insert({
        product_id: product.id,
        supplier,
        supplier_ref,
        supplier_import_batch_id,

        price_locked: false,
        title_locked: false,
        author_locked: false,

        created_by: profile.id,
      });

    if (linkError) throw linkError;

    return NextResponse.json({
      success: true,
      product_id: product.id,
    });
  } catch (err) {
    console.error("❌ CREATE PRODUCT FROM SUPPLIER FAILED:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
