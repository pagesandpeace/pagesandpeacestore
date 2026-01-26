import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      display_title,
      product_type,
      supplier_name,
      inventory_count,
      price,
      retail_price,
      retail_price_override
    `)
    .neq("product_type", "event")
    .ilike("search_text", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ PRODUCT SEARCH ERROR", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((p) => ({
      id: p.id,
      name: p.display_title || p.name,
      product_type: p.product_type,
      supplier: p.supplier_name,
      inventory_count: p.inventory_count ?? 0,

      // passed through for POS / in-store sales
      price: p.price,
      retail_price: p.retail_price,
      retail_price_override: p.retail_price_override,
    }))
  );
}
