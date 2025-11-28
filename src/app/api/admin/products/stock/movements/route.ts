import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockMovements, products, users } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUserServer();

  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: stockMovements.id,
      productName: products.name,
      change: stockMovements.change,
      reason: stockMovements.reason,
      userName: users.name,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(products, eq(products.id, stockMovements.productId))
    .leftJoin(users, eq(users.id, stockMovements.userId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
