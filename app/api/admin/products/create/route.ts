export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import slugify from "slugify";

/* ------------------------------------------
   Helper: link product to supplier (manual)
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

export async function POST(req: Request) {
  try {
    console.log("🛍 [CREATE PRODUCT] Incoming request");

    const body = await req.json();
    console.log("📥 [CREATE PRODUCT] Body:", body);

    const {
      name,
      description = "",
      product_type = "merch",
      image_url = null,

      // pricing
      supplier_price = null,
      markup_percent = null,
      price,

      // fulfilment + supply
      fulfilment_mode,
      supply_source,
      commercial_model,

      // inventory + behaviour
      inventory_count = 0,
      out_of_stock_behavior = "stop_selling",

      // consignment
      consignment_split_percent = null,
      consignment_notes = null,

      // book fields
      author_id = null,
      format = null,
      language = null,

      // categories
      genre_id = null,
      vibe_id = null,
      theme_id = null,

      // 🔹 supplier link
      supplier = null,
      supplier_ref = null,
    } = body;

    /* -------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------- */
    if (!name || !price || !fulfilment_mode) {
      return NextResponse.json(
        { error: "Name, price and fulfilment_mode are required." },
        { status: 400 }
      );
    }

    if (!supply_source || !commercial_model) {
      return NextResponse.json(
        { error: "supply_source and commercial_model are required." },
        { status: 400 }
      );
    }

    if (
      !["stop_selling", "switch_to_made_to_order"].includes(
        out_of_stock_behavior
      )
    ) {
      return NextResponse.json(
        { error: "Invalid out_of_stock_behavior" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       AUTH (ADMIN ONLY)
    ------------------------------------------------- */
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

    /* -------------------------------------------------
       SERVICE ROLE CLIENT
    ------------------------------------------------- */
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* -------------------------------------------------
       SLUG
    ------------------------------------------------- */
    const slug =
      slugify(name, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

    /* -------------------------------------------------
       INVENTORY NORMALISATION
    ------------------------------------------------- */
    const normalisedInventory =
      fulfilment_mode === "physical" ? Number(inventory_count) : 0;

    /* -------------------------------------------------
       PRODUCT PAYLOAD
    ------------------------------------------------- */
    const productPayload: Record<string, unknown> = {
      name,
      display_title: name,
      slug,
      description,
      product_type,
      image_url,

      // pricing
      supplier_price,
      markup_percent,
      price: Number(price).toFixed(2),

      // fulfilment + supply
      fulfilment_mode,
      supply_source,
      commercial_model,

      // inventory + behaviour
      inventory_count: 0,
      out_of_stock_behavior,

      // consignment
      consignment_split_percent,
      consignment_notes,
    };

    /* -------------------------------------------------
       BOOK / BLIND-DATE METADATA
    ------------------------------------------------- */
    const isBookLike =
      product_type === "book" || product_type === "blind-date";

    if (isBookLike) {
      productPayload.author_id = author_id;
      productPayload.format = format;
      productPayload.language = language;
      productPayload.genre_id = genre_id;
      productPayload.vibe_id = vibe_id;
      productPayload.theme_id = theme_id;
    }

    console.log("📦 [CREATE PRODUCT] Insert payload:", productPayload);

    /* -------------------------------------------------
       INSERT PRODUCT
    ------------------------------------------------- */
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .insert(productPayload)
      .select()
      .single();

    if (error) {
      console.error("❌ Product insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Product created:", product.id);
/* -------------------------------------------------
   INITIAL STOCK (LEDGER-SAFE)
------------------------------------------------- */
if (normalisedInventory > 0) {
  await supabaseAdmin.rpc("adjust_product_inventory", {
    p_product_id: product.id,
    p_new_quantity: normalisedInventory,
    p_reason: "initial_stock",
    p_user_id: auth.user.id,
  });
}

    /* -------------------------------------------------
       LINK SUPPLIER (OPTIONAL)
    ------------------------------------------------- */
    try {
      await upsertProductSupplier({
        supabase: supabaseAdmin,
        productId: product.id,
        supplier,
        supplierRef: supplier_ref,
      });
    } catch (err) {
      console.error("❌ Supplier link failed:", err);
      return NextResponse.json(
        { error: "Product created but supplier link failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error("🔥 CREATE PRODUCT ROUTE FAILED:", err);
    return NextResponse.json(
      { error: "Server error creating product" },
      { status: 500 }
    );
  }
}
