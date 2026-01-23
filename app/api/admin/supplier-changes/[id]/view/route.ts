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
    .select("id, product_id, status")
    .eq("id", id)
    .single();

  if (!change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }



  /* -------------------------
     REDIRECT TO PRODUCT EDIT
  ------------------------- */
  return NextResponse.redirect(
    new URL(
      `/admin/products/${change.product_id}`,
      process.env.NEXT_PUBLIC_SITE_URL
    )
  );
}
