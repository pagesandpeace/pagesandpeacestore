export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* AUTH */
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

    /* PREVENT DUPLICATES (CRITICAL) */
    const { data: existingLink } = await admin
      .from("product_supplier_links")
      .select("product_id")
      .eq("supplier", supplier)
      .eq("supplier_ref", supplier_ref)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        {
          error: "Product already exists for this supplier item",
          product_id: existingLink.product_id,
        },
        { status: 409 }
      );
    }

    /* FETCH SUPPLIER SNAPSHOT */
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

    const slug =
      slugify(sp.display_title ?? sp.title, { lower: true, strict: true }) +
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

        price: sp.rrp ?? 0,
        rrp: sp.rrp,

        inventory_count: 0,
        fulfilment_mode: "made_to_order",
        out_of_stock_behavior: "stop_selling",

        supply_source: "supplier",
        commercial_model: "supplier",
        requires_procurement: true,

        author: sp.author,
        format: sp.binding,
        language: "English",

        supplier_name: supplier,
        isbn_13: supplier_ref.replace(/-/g, ""),

        image_url:
          "https://res.cloudinary.com/dadinnds6/image/upload/v1767755489/Fallback_image_cxsiwb.png",
      })
      .select("id")
      .single();

    if (productError || !product) throw productError;

    /* LINK (IMMUTABLE) */
    await admin.from("product_supplier_links").insert({
      product_id: product.id,
      supplier,
      supplier_ref,
      supplier_product_id: sp.id,
      supplier_import_batch_id: sp.import_batch_id,
      created_by: auth.user.id,
    });

    return NextResponse.json({
      success: true,
      product_id: product.id,
    });
  } catch (err) {
    console.error("❌ CREATE FROM SUPPLIER FAILED:", err);
    return NextResponse.json(
      { error: "Failed to create catalogue product" },
      { status: 500 }
    );
  }
}
