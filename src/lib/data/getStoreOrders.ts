"use server";

import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  products,
  events,
} from "@/lib/db/schema";
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

  // Load all order items
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

  // Load ALL events (cheap—small table)
  const eventRows = await db.select().from(events);
  const eventMap = Object.fromEntries(
    eventRows.map((ev) => [ev.id, ev.title])
  );

  // Group items by order
  const grouped: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    if (!grouped[item.orderId]) grouped[item.orderId] = [];
    grouped[item.orderId].push({
      ...item,
      productName:
        item.productName || eventMap[item.productId] || "Unknown Event",
    });
  }

  return rows.map((o) => {
    const items = grouped[o.id] || [];

    // If event order → always 1 item
    const isEventOrder =
      items.length === 1 &&
      eventMap[items[0].productId] !== undefined;

    const itemCount = isEventOrder
      ? 1
      : items.reduce((sum, i) => sum + i.quantity, 0);

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
