// app/api/products/stock-check/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({}, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, inventory_count")
      .in("id", ids);

    if (error) {
      console.error("❌ Stock-check error:", error);
      return NextResponse.json({}, { status: 500 });
    }

    // Format as { productId: stock }
    const map: Record<string, number> = {};
    for (const p of data) {
      map[p.id] = p.inventory_count ?? 0;
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error("❌ Stock-check fatal error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
