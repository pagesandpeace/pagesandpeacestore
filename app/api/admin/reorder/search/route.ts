export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

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
       BASE QUERY (AUTHOR ROUTE STYLE)
    ------------------------- */
    const query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        display_title,
        product_type,
        inventory_count,
        supplier_name
        `
      )
      .neq("product_type", "event")
      .eq("is_test", false)
      .order("name")
      .limit(20);

    if (q) {
      query.or(
        `name.ilike.%${q}%,display_title.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* -------------------------
       NORMALISE (UI-FRIENDLY)
    ------------------------- */
    const results = (data ?? []).map((p) => ({
      id: p.id,
      name: p.display_title || p.name,
      product_type: p.product_type,
      supplier: p.supplier_name ?? null,
      inventory_count: p.inventory_count ?? 0,
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("❌ BACKORDER SEARCH CRASH", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
