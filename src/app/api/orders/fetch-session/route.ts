import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const sessionId = new URL(req.url).searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1. Look up order in DB by Stripe session ID
    const dbOrder = (
      await db
        .select()
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, sessionId))
        .limit(1)
    )[0];

    if (!dbOrder) {
      return NextResponse.json(
        { error: "Order not found in database" },
        { status: 404 }
      );
    }

    // 2. Load order items + join products
    const items = await db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, dbOrder.id));

    return NextResponse.json({
      order: {
        id: dbOrder.id,
        created_at: dbOrder.createdAt,
        total: Number(dbOrder.total),
        status: dbOrder.status,
        items,
        stripe_receipt_url: dbOrder.stripeReceiptUrl,
        paid_at: dbOrder.paidAt,
      },
    });
  } catch (err) {
    console.error("❌ fetch-session error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
