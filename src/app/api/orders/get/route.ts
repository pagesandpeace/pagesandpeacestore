import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  products,
  events,
} from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const base = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!base.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = base[0];

    // Fetch order items normally
    let items = await db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    console.log("🧾 Raw items:", items);

    // Find missing productNames (event items)
    const missing = items.filter((i) => !i.productName).map((i) => i.productId);

    console.log("📌 Missing productName for productIds:", missing);

    if (missing.length > 0) {
      const eventRows = await db
        .select()
        .from(events)
        .where(inArray(sql`${events.id}::text`, missing));

      const lookup = Object.fromEntries(
        eventRows.map((ev) => [ev.id, ev.title])
      );

      items = items.map((i) => ({
        ...i,
        productName: i.productName || lookup[i.productId] || "Event Booking",
      }));
    }

    console.log("✅ Final items returned:", items);

    return NextResponse.json({
      order: {
        id: order.id,
        created_at: order.createdAt,
        total: Number(order.total),
        status: order.status,
        items,
        stripe_payment_intent_id: order.stripePaymentIntentId ?? null,
        stripe_checkout_session_id: order.stripeCheckoutSessionId ?? null,
        stripe_receipt_url: order.stripeReceiptUrl ?? null,
        stripe_card_brand: order.stripeCardBrand ?? null,
        stripe_last4: order.stripeLast4 ?? null,
        paid_at: order.paidAt ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/orders/get error:", err);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
