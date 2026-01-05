export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const DEFAULT_MARKUP_PERCENT = 30;

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function normaliseFormat(binding?: string | null): string | null {
  if (!binding) return null;
  const b = binding.toLowerCase();
  if (b.includes("hard")) return "Hardback";
  if (b.includes("paper") || b.includes("soft")) return "Paperback";
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH (ADMIN)
    ------------------------- */
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

    /* -------------------------
       INPUT
    ------------------------- */
    const { supplier, supplier_ref } = await req.json();

    if (!supplier || !supplier_ref) {
      return NextResponse.json(
        { error: "supplier and supplier_ref required" },
        { status: 400 }
      );
    }

    /* -------------------------
       SERVICE ROLE CLIENT
    ------------------------- */
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* -------------------------
       FETCH SUPPLIER PRODUCT
    ------------------------- */
    const { data: sp, error: spError } = await admin
      .from("supplier_products")
      .select("*")
      .eq("supplier", supplier)
      .eq("supplier_ref", supplier_ref)
      .single();

    if (spError || !sp) {
      return NextResponse.json(
        { error: "Supplier product not found" },
        { status: 404 }
      );
    }

    /* -------------------------
       PREVENT DUPLICATE LINK
    ------------------------- */
    const { data: existingLink } = await admin
      .from("product_supplier_links")
      .select("id")
      .eq("supplier", supplier)
      .eq("supplier_ref", supplier_ref)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        { error: "Product already created from this supplier item" },
        { status: 409 }
      );
    }

    /* -------------------------
       PRICE CALCULATION
    ------------------------- */
    const supplierPrice = Number(sp.supplier_price);
    const retailPrice = Number(
      (supplierPrice * (1 + DEFAULT_MARKUP_PERCENT / 100)).toFixed(2)
    );

    /* -------------------------
       FORMAT + LANGUAGE
    ------------------------- */
    const format = normaliseFormat(sp.binding);
    const language = "English";

    /* -------------------------
       CREATE PRODUCT
    ------------------------- */
    const slug =
      slugify(sp.display_title ?? sp.title, {
        lower: true,
        strict: true,
      }) +
      "-" +
      supplier_ref.slice(-6);

    const { data: product, error: productError } = await admin
      .from("products")
      .insert({
        name: sp.title,
        display_title: sp.display_title,
        slug,

        product_type: "book",

        price: retailPrice,
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        price_strategy: "markup",
        markup_percent: DEFAULT_MARKUP_PERCENT,

        inventory_count: 0,
        is_subscription: false,
        is_test: false,

        commercial_model: "supplier",
        fulfilment_mode: "made_to_order",
        supply_source: "supplier",
        out_of_stock_behavior: "stop_selling",

        author: sp.author,
        format,
        language,

        supplier_name: supplier,
        isbn_13: supplier_ref,
        supplier_import_batch_id: sp.import_batch_id,
      })
      .select("id")
      .single();

    if (productError || !product) {
      throw productError;
    }

    /* -------------------------
       SUPPLIER LINK (IMMUTABLE)
    ------------------------- */
    const { error: linkError } = await admin
      .from("product_supplier_links")
      .insert({
        product_id: product.id,
        supplier,
        supplier_ref,
        supplier_import_batch_id: sp.import_batch_id,

        supplier_price_at_creation: supplierPrice,
        supplier_title_at_creation: sp.display_title,
        supplier_author_at_creation: sp.author,
        supplier_binding_at_creation: sp.binding,

        created_by: auth.user.id,
        supplier_product_id: sp.id,
      });

    if (linkError) throw linkError;

    /* ==================================================
       ✅ INSERT PRODUCT RANKING (OPTION B – FIX)
    ================================================== */
    if (sp.rank_pos && sp.import_month) {
      // Ensure idempotency
      await admin
        .from("product_rankings")
        .delete()
        .eq("product_id", product.id)
        .eq("supplier_name", supplier)
        .eq("import_month", sp.import_month);

      const { error: rankingError } = await admin
        .from("product_rankings")
        .insert({
          product_id: product.id,
          isbn_13: supplier_ref,
          supplier_name: supplier,
          rank: sp.rank_pos,
          import_month: sp.import_month,
        });

      if (rankingError) throw rankingError;
    }

    /* -------------------------
       DONE
    ------------------------- */
    return NextResponse.json({
      product_id: product.id,
      retail_price: retailPrice,
    });
  } catch (err) {
    console.error("❌ CREATE FROM SUPPLIER FAILED:", err);
    return NextResponse.json(
      { error: "Failed to create catalogue product" },
      { status: 500 }
    );
  }
}