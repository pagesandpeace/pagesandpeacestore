import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
});


// Helper to convert ReadableStream → Buffer
async function buffer(readable: ReadableStream | null) {
  if (!readable) return Buffer.alloc(0);
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const bodyBuffer = await buffer(req.body as ReadableStream);
    event = stripe.webhooks.constructEvent(bodyBuffer, sig, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Stripe signature verification failed:", error.message);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  // ✅ Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      console.log("✅ Payment completed:", session.id);

      const total = (session.amount_total ?? 0) / 100;
      const orderId = uuidv4();

      // Ensure Guest user exists
      await db
        .insert(users)
        .values({
          id: "guest",
          name: "Guest",
          email: "guest@pagesandpeace.com",
          emailVerified: true,
        })
        .onConflictDoNothing();

      // Insert order record
      await db.insert(orders).values({
        id: orderId,
        userId: "guest",
        total,
        status: "completed",
      });

      console.log("🧾 Order recorded successfully:", orderId);

      // 🆕 Fetch line items from Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      console.log(`📦 Found ${lineItems.data.length} items for order.`);

      // 🆕 Insert order items into DB
      for (const item of lineItems.data) {
        const itemId = uuidv4();
        const price = item.amount_total ? item.amount_total / 100 : 0;

        await db.insert(orderItems).values({
          id: itemId,
          orderId,
          productId: item.price?.product as string, // placeholder for now
          quantity: item.quantity ?? 1,
          price,
        });

        console.log(`   → Added item: ${item.description} (£${price.toFixed(2)})`);
      }

      console.log("✅ All order items recorded successfully.");
    } catch (dbError) {
      console.error("❌ Failed to insert order:", dbError);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
