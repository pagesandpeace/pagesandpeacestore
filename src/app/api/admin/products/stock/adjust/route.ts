import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, stockMovements } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    // SECURITY — only admin or staff
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const body = await req.json();
    const { productId, change, reason } = body;

    console.log("STOCK ADJUST HIT:", body);

    if (!productId || change === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1️⃣ UPDATE PRODUCT STOCK
    await db
      .update(products)
      .set({
        inventory_count: sql`${products.inventory_count} + ${change}`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(products.id, productId));

    // 2️⃣ LOG INTO THE STOCK MOVEMENTS TABLE
    await db.insert(stockMovements).values({
      productId,
      change,
      reason,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Stock adjust error:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
