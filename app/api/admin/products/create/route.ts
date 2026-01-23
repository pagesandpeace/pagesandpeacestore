export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import slugify from "slugify";
import cloudinary from "@/lib/cloudinary";

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
   Helper: Gardners jacket URL
------------------------------------------ */
function gardnersJacketUrl(isbn13: string) {
  const clean = isbn13.replace(/-/g, "");
  return `https://jackets.dmmserver.com/media/640/${clean.slice(
    0,
    7
  )}/${clean}.jpg`;
}

/* ------------------------------------------
   ROUTE
------------------------------------------ */
export async function POST(req: Request) {
  try {
    console.log("🛍 [CREATE PRODUCT] Incoming request");

    const body = await req.json();
    console.log("📥 [CREATE PRODUCT] Body:", body);

    const {
      name,
      display_title,
      description = "",
      product_type = "merch",
      image_url = null,

      // pricing (NEW MODEL)
      price,
      rrp = null,

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
      author = null,
      format = null,
      language = null,

      // categories
      genre_id = null,
      vibe_id = null,
      theme_id = null,

      // supplier link
      supplier = null,
      supplier_ref = null,

      // ISBN
      isbn_13 = null,
    } = body;

    /* -------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------- */
    if (!name || price == null || !fulfilment_mode) {
      return NextResponse.json(
        { error: "name, price and fulfilment_mode are required" },
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
       PRODUCT PAYLOAD (NEW TRUTH)
    ------------------------------------------------- */
    const productPayload: Record<string, unknown> = {
      name,
      display_title: display_title ?? name,
      slug,
      description,
      product_type,
      image_url,

      price: Number(price),
      rrp,

      fulfilment_mode,
      supply_source,
      commercial_model,

      inventory_count: 0, // ledger-controlled
      out_of_stock_behavior,

      consignment_split_percent,
      consignment_notes,

      isbn_13,
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

      if (author_id) {
        const { data: authorRow } = await supabaseAdmin
          .from("authors")
          .select("name")
          .eq("id", author_id)
          .single();

        productPayload.author = authorRow?.name ?? null;
      } else if (author) {
        productPayload.author = author;
      }
    }

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

    /* -------------------------------------------------
       ISBN JACKET (NON-BLOCKING)
    ------------------------------------------------- */
    if (isbn_13 && !image_url) {
      try {
        const upload = await cloudinary.uploader.upload(
          gardnersJacketUrl(isbn_13),
          {
            folder: "products/books",
            public_id: `isbn_${isbn_13}`,
            overwrite: false,
          }
        );

        if (upload?.secure_url) {
          await supabaseAdmin
            .from("products")
            .update({ image_url: upload.secure_url })
            .eq("id", product.id);
        }
      } catch {
        console.log("⚠️ No jacket found for ISBN:", isbn_13);
      }
    }

    /* -------------------------------------------------
       INITIAL STOCK (LEDGER)
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
       SUPPLIER LINK (REFERENCE ONLY)
    ------------------------------------------------- */
    await upsertProductSupplier({
      supabase: supabaseAdmin,
      productId: product.id,
      supplier,
      supplierRef: supplier_ref,
    });

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error("🔥 CREATE PRODUCT FAILED:", err);
    return NextResponse.json(
      { error: "Server error creating product" },
      { status: 500 }
    );
  }
}
