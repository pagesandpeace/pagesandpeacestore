export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabaseUser = await supabaseServer();
  const { data: auth } = await supabaseUser.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  await supabaseAdmin
    .from("supplier_changes")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.redirect(
    new URL("/admin/supplier-changes", process.env.NEXT_PUBLIC_SITE_URL)
  );
}
