export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    console.log("🟡 [BACKORDER LIST] route hit");

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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       LOAD BOARD
    ------------------------- */
    const { data, error } = await supabase
      .from("supplier_order_requests")
      .select(`
        id,
        quantity,
        status,
        supplier,
        item_type,
        products (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("🔴 [BACKORDER LIST] query failed", error);
      throw error;
    }

    /* -------------------------
       SHAPE FOR UI
    ------------------------- */
    const rows = (data ?? []).map((row) => ({
      id: row.id,
      product_name: row.products?.[0]?.name ?? "Unknown product",
      item_type: row.item_type,
      supplier: row.supplier,
      quantity: row.quantity,
      status: row.status,
    }));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("🔥 [BACKORDER LIST] crashed", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
