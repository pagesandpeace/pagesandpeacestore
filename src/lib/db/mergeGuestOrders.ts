import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { guestOrders, guestOrderItems, orders, orderItems } from "./schema";
import { v4 as uuidv4 } from "uuid";

/**
 * When a guest signs up and their email already has guest orders,
 * convert those guest orders to real user orders.
 */
export async function mergeGuestOrdersForUser(userId: string, email: string) {
  // Fetch all guest orders with matching email
  const guests = await db.select().from(guestOrders).where(eq(guestOrders.email, email));

  for (const g of guests) {
    const newOrderId = uuidv4();

    // Insert into real orders table
    await db.insert(orders).values({
      id: newOrderId,
      userId,
      total: g.total,
      status: g.status,
      createdAt: g.createdAt,
      stripeCheckoutSessionId: g.stripeCheckoutSessionId,
      stripePaymentIntentId: g.stripePaymentIntentId,
      stripeReceiptUrl: g.stripeReceiptUrl,
      stripeCardBrand: g.stripeCardBrand,
      stripeLast4: g.stripeLast4,
      paidAt: g.paidAt,
    });

    // Copy items
    const items = await db
      .select()
      .from(guestOrderItems)
      .where(eq(guestOrderItems.guestOrderId, g.id));

    for (const item of items) {
      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId: newOrderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      });
    }
  }

  // Delete guest rows now merged
  await db.delete(guestOrders).where(eq(guestOrders.email, email));
}
