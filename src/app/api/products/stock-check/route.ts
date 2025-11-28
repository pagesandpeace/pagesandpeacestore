import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({});
    }

    // Fetch only stock fields
    const rows = await db
      .select({
        id: products.id,
        inventory_count: products.inventory_count,
      })
      .from(products)
      .where(inArray(products.id, ids));

    // Convert DB rows → map: { productId: stock }
    const stockMap: Record<string, number> = {};
    for (const row of rows) {
      stockMap[row.id] = row.inventory_count;
    }

    return NextResponse.json(stockMap);
  } catch (err) {
    console.error("❌ Stock check error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
