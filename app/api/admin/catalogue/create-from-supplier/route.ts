export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";
import cloudinary from "@/lib/cloudinary";

const FALLBACK_IMAGE =
  "https://res.cloudinary.com/dadinnds6/image/upload/v1767755489/Fallback_image_cxsiwb.png";

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

function gardnersJacketUrl(isbn13: string) {
  const clean = isbn13.replace(/-/g, "");
  return `https://jackets.dmmserver.com/media/640/${clean.slice(
    0,
    7
  )}/${clean}.jpg`;
}

/* --------------------------------------------------
   ROUTE
-------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* AUTH */
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

    /* INPUT */
    const { supplier, supplier_ref } = await req.json();
    if (!supplier || !supplier_ref) {
      return NextResponse.json(
        { error: "supplier and supplier_ref required" },
        { status: 400 }
      );
    }

    /* SERVICE ROLE */
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* FETCH SUPPLIER PRODUCT */
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

    /* PREVENT DUPLICATE */
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

    /* FORMAT / METADATA */
    const format = normaliseFormat(sp.binding);
    const language = "English";

    /* PRICING LOGIC (NEW) */
    const supplierRrp =
      sp.rrp != null ? Number(sp.rrp) : null;

    const sellingPrice = supplierRrp; // may be null

    /* SLUG */
    const slug =
      slugify(sp.display_title ?? sp.title, {
        lower: true,
        strict: true,
      }) +
      "-" +
      supplier_ref.slice(-6);

    /* CREATE PRODUCT */
    const { data: product, error: productError } = await admin
      .from("products")
      .insert({
        name: sp.title,
        display_title: sp.display_title,
        slug,

        product_type: "book",

        // 🔑 Pricing
        price: sellingPrice ?? 0,
        rrp: supplierRrp,

        // Stock / fulfilment
        inventory_count: 0,
        fulfilment_mode: "made_to_order",
        supply_source: "supplier",
        out_of_stock_behavior: "stop_selling",

        commercial_model: "supplier",
        requires_procurement: true,

        author: sp.author,
        format,
        language,

        supplier_name: supplier,
        isbn_13: supplier_ref.replace(/-/g, ""),
        supplier_import_batch_id: sp.import_batch_id,

        image_url: FALLBACK_IMAGE,
      })
      .select("id")
      .single();

    if (productError || !product) throw productError;

    /* TRY FETCH JACKET */
    try {
      const cleanIsbn = supplier_ref.replace(/-/g, "");
      const upload = await cloudinary.uploader.upload(
        gardnersJacketUrl(cleanIsbn),
        {
          folder: "products/books",
          public_id: `isbn_${cleanIsbn}`,
          overwrite: false,
          resource_type: "image",
        }
      );

      if (upload?.secure_url) {
        await admin
          .from("products")
          .update({ image_url: upload.secure_url })
          .eq("id", product.id);
      }
    } catch {
      console.log("⚠️ Gardners jacket not available");
    }

    /* SUPPLIER LINK (AUDIT ONLY) */
    await admin.from("product_supplier_links").insert({
      product_id: product.id,
      supplier,
      supplier_ref,
      supplier_import_batch_id: sp.import_batch_id,

      supplier_rrp_at_creation: supplierRrp,
      supplier_title_at_creation: sp.display_title,
      supplier_author_at_creation: sp.author,
      supplier_binding_at_creation: sp.binding,

      created_by: auth.user.id,
      supplier_product_id: sp.id,
    });

    return NextResponse.json({
      product_id: product.id,
      price: sellingPrice,
      rrp: supplierRrp,
    });
  } catch (err) {
    console.error("❌ CREATE FROM SUPPLIER FAILED:", err);
    return NextResponse.json(
      { error: "Failed to create catalogue product" },
      { status: 500 }
    );
  }
}
