"use server";

import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function getStoreOrders(userId: string | undefined) {
  if (!userId) return [];

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (rows.length === 0) return [];

  const orderIds = rows.map((o) => o.id);

  const allItems = await db
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      price: orderItems.price,
      productName: products.name,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, orderIds));

  const grouped: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    if (!grouped[item.orderId]) grouped[item.orderId] = [];
    grouped[item.orderId].push(item);
  }

  return rows.map((o) => {
    const items = grouped[o.id] || [];
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: o.id,
      type: "store" as const,
      created_at: o.createdAt ?? null,
      total: Number(o.total),
      status: o.status ?? "completed",
      items,
      itemCount,
      receipt: `/dashboard/orders/${o.id}`,
    };
  });
}
