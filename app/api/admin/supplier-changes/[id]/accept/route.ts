export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  /* -------------------------
     AUTH
  ------------------------- */
  const supabaseUser = await supabaseServer();
  const { data: auth } = await supabaseUser.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  /* -------------------------
     ADMIN CLIENT
  ------------------------- */
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* -------------------------
     LOAD CHANGE
  ------------------------- */
  const { data: change } = await supabaseAdmin
    .from("supplier_changes")
    .select("*")
    .eq("id", id)
    .single();

  if (!change || change.status !== "pending") {
    return NextResponse.json({ error: "Invalid change" }, { status: 400 });
  }

  /* -------------------------
     LOAD PRODUCT
  ------------------------- */
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("supplier_price, price, markup_percent")
    .eq("id", change.product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const newSupplierPrice = Number(change.new_value);

  /* -------------------------
     CALCULATE NEW RETAIL PRICE
     (preserve existing markup)
  ------------------------- */
  const markupPercent =
    product.markup_percent != null
      ? Number(product.markup_percent)
      : 30; // safe fallback

  const newRetailPrice = Number(
    (newSupplierPrice * (1 + markupPercent / 100)).toFixed(2)
  );

  /* -------------------------
     APPLY CHANGE
  ------------------------- */
  await supabaseAdmin
    .from("products")
    .update({
      supplier_price: newSupplierPrice,
      price: newRetailPrice,
      retail_price: newRetailPrice,
      supplier_last_updated: new Date().toISOString(),
    })
    .eq("id", change.product_id);

  /* -------------------------
     MARK RESOLVED
  ------------------------- */
  await supabaseAdmin
    .from("supplier_changes")
    .update({
      status: "accepted",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.redirect(
    new URL("/admin/supplier-changes", process.env.NEXT_PUBLIC_SITE_URL)
  );
}
