// src/app/api/orders/get/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    // 1. Fetch order
    const base = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!base || base.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = base[0];

    // 2. Fetch line items
    const items = await db
      .select({
        productName: products.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    // 3. Return unified response
    return NextResponse.json({
      order: {
        id: order.id,
        created_at: order.createdAt,
        total: Number(order.total),
        status: order.status,
        items,

        // 🔥 Stripe metadata
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
    return NextResponse.json(
      { error: "Failed to load order" },
      { status: 500 }
    );
  }
}
