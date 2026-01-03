export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

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
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       SEARCH PRODUCTS
    ------------------------- */
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        product_type,
        supplier_name,
        inventory_count
      `
      )
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(10);

    if (error) {
      console.error("❌ Backorders search failed", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        product_type: p.product_type,
        supplier: p.supplier_name ?? null,
        inventory_count: p.inventory_count ?? 0,
      }))
    );
  } catch (err) {
    console.error("🔥 Backorders search crashed", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
