export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveSupplierPO } from "@/lib/resolveSupplierPO";

export async function POST(req: Request) {
  try {
    const { id, reason } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    /* ---------- AUTH ---------- */
    const authSupabase = await supabaseServer();
    const { data: auth } = await authSupabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await authSupabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* ---------- SERVICE ROLE ---------- */
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ---------- LOAD ROW ---------- */
    const { data: row } = await supabase
      .from("customer_backorders")
      .select(
        `
        id,
        quantity,
        received_quantity,
        supplier_po_id
      `
      )
      .eq("id", id)
      .single();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if ((row.received_quantity ?? 0) > 0) {
      return NextResponse.json(
        { error: "Use cancel-remaining for partially received orders" },
        { status: 400 }
      );
    }

    /* ---------- FULL CANCELLATION ---------- */
    await supabase
      .from("customer_backorders")
      .update({
        cancelled_quantity: row.quantity,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason ?? "Cancelled before ordering",
      })
      .eq("id", id);

    /* ---------- RESOLVE PO ---------- */
    if (row.supplier_po_id) {
      await resolveSupplierPO(supabase, row.supplier_po_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ cancel-before-ordered failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
