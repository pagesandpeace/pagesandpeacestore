import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { orders, orderItems, users, products } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm"; // ✅ explicit import

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// ---- Helper: convert ReadableStream → Buffer (Edge/runtime safe) ----
async function buffer(readable: ReadableStream | null): Promise<Buffer> {
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
    console.error("❌ Missing Stripe signature or webhook secret.");
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // ---- Verify webhook signature ----
  try {
    const bodyBuffer = await buffer(req.body as ReadableStream);
    event = stripe.webhooks.constructEvent(bodyBuffer, sig, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Stripe signature verification failed:", error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  // ---- Handle successful checkout session ----
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      console.log("✅ Payment completed:", session.id);

      const total = (session.amount_total ?? 0) / 100;
      const orderId = uuidv4();

      // Ensure Guest user exists (so FK constraint is satisfied)
      await db
        .insert(users)
        .values({
          id: "guest",
          name: "Guest",
          email: "guest@pagesandpeace.com",
          emailVerified: true,
        })
        .onConflictDoNothing();

      // Insert base order
      await db.insert(orders).values({
        id: orderId,
        userId: "guest",
        total,
        status: "completed",
      });

      console.log("🧾 Order recorded successfully:", orderId);

      // ---- Fetch line items from Stripe ----
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      console.log(`📦 Found ${lineItems.data.length} items for order.`);

      for (const item of lineItems.data) {
        const itemId = uuidv4();
        const quantity = item.quantity ?? 1;
        const price = item.amount_total ? item.amount_total / 100 : 0;

        const productName =
          item.description ?? item.price?.nickname ?? "Unknown Product";

        // 🔍 Try to find matching product in DB
        const [dbProduct] = await db
          .select()
          .from(products)
          .where(eq(products.name, productName))
          .limit(1);

        // ✅ If no match, skip linking to prevent FK violation
        if (!dbProduct) {
          console.warn(`⚠️ No product match found for "${productName}". Skipping FK.`);
        }

        await db.insert(orderItems).values({
          id: itemId,
          orderId,
          productId: dbProduct ? dbProduct.id : "unlinked", // fallback if product missing
          quantity,
          price,
        });

        console.log(`   → Added item: ${productName} (£${price.toFixed(2)})`);
      }

      console.log("✅ All order items recorded successfully.");
    } catch (dbError) {
      console.error("❌ Failed to insert order or order items:", dbError);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
