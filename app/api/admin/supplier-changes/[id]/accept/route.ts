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
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: "Invalid or already processed change" },
      { status: 400 }
    );
  }

  /* -------------------------
     LOAD PRODUCT (REFERENCE ONLY)
  ------------------------- */
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, rrp")
    .eq("id", change.product_id)
    .single();

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  /* -------------------------
     APPLY CHANGE (RRP ONLY)
  ------------------------- */
  if (change.field === "rrp") {
    const newRrp = Number(change.new_value);

    if (Number.isFinite(newRrp)) {
      await supabaseAdmin
        .from("products")
        .update({
          rrp: newRrp,
          supplier_last_updated: new Date().toISOString(),
        })
        .eq("id", product.id);
    }
  }

  /* -------------------------
     MARK CHANGE RESOLVED
  ------------------------- */
  await supabaseAdmin
    .from("supplier_changes")
    .update({
      status: "accepted",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.redirect(
    new URL(
      "/admin/supplier-changes",
      process.env.NEXT_PUBLIC_SITE_URL
    )
  );
}
