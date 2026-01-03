export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
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
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       FETCH PRODUCT
       (format + language come directly from products)
    ------------------------- */
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        genre:genres(id, name),
        vibe:vibes(id, name),
        theme:themes(id, name)
      `)
      .eq("id", productId)
      .neq("product_type", "event")
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    /* -------------------------
       FETCH SUPPLIER LINK
    ------------------------- */
    const { data: link } = await supabase
      .from("product_supplier_links")
      .select(`
        supplier,
        supplier_ref,
        supplier_import_batch_id,
        created_at
      `)
      .eq("product_id", productId)
      .maybeSingle();

    const supplierConfidence = link ? "exact" : "manual";

    /* -------------------------
       RETURN
    ------------------------- */
    return NextResponse.json({
      ...product,

      // canonical author link (may be null)
      author_id: product.author_id ?? null,

      // supplier-only author text (read-only context)
      supplier_author: product.author ?? null,

      // supplier metadata
      supplier: link?.supplier ?? product.supplier_name ?? null,
      supplier_ref: link?.supplier_ref ?? product.isbn_13 ?? null,
      supplier_confidence: supplierConfidence,
    });
  } catch (err) {
    console.error("🔥 Product GET route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
