export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ⭐ FIX: unwrap params (Next.js 15)
    const { id: productId } = await context.params;

    const supabase = await supabaseServer();

    // AUTH
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    // ⭐ FIX: JOIN metadata instead of returning raw IDs
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        genre:genres(id, name),
        vibe:vibes(id, name),
        theme:themes(id, name)
      `)
      .eq("id", productId)
      .neq("product_type", "event") // 🚫 never show event ticket products
      .single();

    if (error || !product) {
      console.error("❌ Product fetch error:", error);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("🔥 Product GET route crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
