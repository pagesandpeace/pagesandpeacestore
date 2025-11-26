/* ===========================================================
   FINAL MERGED STRIPE WEBHOOK
   VOUCHERS + EVENTS + PRODUCT ORDERS (INLINE PRICE_DATA)
=========================================================== */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  vouchers,
  events,
  eventBookings,
  stores,
} from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { sendVoucherEmails } from "@/lib/email/vouchers";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

/* -------------------------------------------------------
   RAW BODY READER (required by Stripe)
------------------------------------------------------- */
async function readRawBody(stream: ReadableStream | null): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function generateVoucherCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick4 = () =>
    Array.from({ length: 4 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  return `PP-${pick4()}-${pick4()}`;
}

function addMonths(date: Date, m: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d.toISOString();
}

type Delivery = "email_now" | "schedule" | "print";
function asDelivery(x: string | null | undefined): Delivery {
  return x === "email_now" || x === "schedule" || x === "print"
    ? x
    : "email_now";
}

/* -------------------------------------------------------
   MAIN WEBHOOK HANDLER
------------------------------------------------------- */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let stripeEvent: Stripe.Event;

  try {
    const raw = await readRawBody(req.body as ReadableStream);
    stripeEvent = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }

  // Process only completed checkout sessions
  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};
  const amountPaid = (session.amount_total ?? 0) / 100;

  /* ============================================================
     FLOW 1 — VOUCHERS
  ============================================================ */
  if (typeof md.delivery === "string") {
    try {
      const buyerEmail =
        md.buyerEmail ||
        session.customer_details?.email ||
        session.customer_email ||
        "";

      const existing = await db
        .select({ id: vouchers.id })
        .from(vouchers)
        .where(eq(vouchers.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (!existing.length) {
        const code = generateVoucherCode();
        const expiresAt = addMonths(new Date(), 24);

        await db.insert(vouchers).values({
          code,
          amountInitialPence: session.amount_total ?? 0,
          amountRemainingPence: session.amount_total ?? 0,
          currency: session.currency ?? "gbp",
          status: "active",
          buyerEmail,
          recipientEmail: md.recipientEmail || null,
          personalMessage: md.message || null,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          stripeCheckoutSessionId: session.id,
          expiresAt,
        });

        await sendVoucherEmails({
          delivery: asDelivery(md.delivery),
          buyerEmail,
          recipientEmail: md.recipientEmail || null,
          toName: md.toName || null,
          fromName: md.fromName || null,
          message: md.message || null,
          code,
          amountPence: session.amount_total ?? 0,
          currency: session.currency ?? "gbp",
          voucherUrl: `${SITE_URL}/vouchers/${code}`,
          sendDateISO: md.sendDate || null,
        });
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Voucher Flow Error:", err);
      return NextResponse.json({ received: true });
    }
  }

  /* ============================================================
     FLOW 2 — EVENTS 
  ============================================================ */
  if (md.kind === "event") {
    try {
      const { eventId, userId, bookingId } = md;
      if (!eventId || !userId || !bookingId) {
        return NextResponse.json({ received: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      // Insert booking
      const [booking] = await db
        .insert(eventBookings)
        .values({
          id: bookingId,
          eventId,
          userId,
          paid: true,
          cancelled: false,
          email:
            session.customer_details?.email || session.customer_email || null,
          name: session.customer_details?.name || null,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        })
        .returning();

      const [ev] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!ev) return NextResponse.json({ received: true });

      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, ev.storeId))
        .limit(1);

      const storeAddress = store?.address ?? "Pages & Peace Bookshop";

      // Stripe receipt
      let receiptUrl: string | null = null;
      let cardBrand: string | null = null;
      let last4: string | null = null;
      let paidAt: string | null = null;

      if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });

        const charge = pi.latest_charge as Stripe.Charge | null;
        receiptUrl = charge?.receipt_url ?? null;
        cardBrand = charge?.payment_method_details?.card?.brand ?? null;
        last4 = charge?.payment_method_details?.card?.last4 ?? null;
        paidAt = charge?.created
          ? new Date(charge.created * 1000).toISOString()
          : null;
      }

      // Create ORDER
      const orderId = uuidv4();

      await db.insert(orders).values({
        id: orderId,
        userId,
        total: String(amountPaid),
        status: "completed",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeReceiptUrl: receiptUrl,
        stripeCardBrand: cardBrand,
        stripeLast4: last4,
        paidAt,
      });

      // Order item
      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId,
        productId: ev.productId,
        quantity: 1,
        price: String(amountPaid),
      });

      // Confirmation email
      const eventDate = new Date(ev.date).toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await resend.emails.send({
        from: "Pages & Peace <noreply@pagesandpeace.co.uk>",
        to:
          booking.email ||
          session.customer_details?.email ||
          "",
        subject: `Your Booking: ${ev.title}`,
        html: `
          <div style="font-family: Arial; line-height: 1.6;">
            <h2>Your Pages & Peace Event Booking is Confirmed 📚</h2>
            <h3>${ev.title}</h3>
            <p><strong>Date & Time:</strong> ${eventDate}</p>
            <p><strong>Location:</strong> ${storeAddress}</p>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
          </div>
        `,
      });

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Event Flow Error:", err);
      return NextResponse.json({ received: true });
    }
  }

  /* ============================================================
     FLOW 3 — PHYSICAL PRODUCTS
     Using INLINE price_data (NO Stripe Products)
  ============================================================ */
  if (md.kind === "product") {
    try {
      console.log("🛒 Processing PRODUCT ORDER");

      const userId = md.userId;
      const items = JSON.parse(md.items || "[]");

      if (!userId || !Array.isArray(items)) {
        console.warn("❌ Invalid metadata");
        return NextResponse.json({ received: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      // Stripe receipt
      const pi = paymentIntentId
        ? await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge"],
          })
        : null;

      const charge = pi?.latest_charge as Stripe.Charge | null;

      const receiptUrl = charge?.receipt_url ?? null;
      const cardBrand = charge?.payment_method_details?.card?.brand ?? null;
      const last4 = charge?.payment_method_details?.card?.last4 ?? null;
      const paidAt = charge?.created
        ? new Date(charge.created * 1000).toISOString()
        : null;

      // Prevent duplicate
      const existing = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (existing.length) {
        console.log("⏭ Order already exists");
        return NextResponse.json({ received: true });
      }

      // FIX: Create proper UUID order ID
      const orderId = uuidv4();

      await db.insert(orders).values({
        id: orderId,
        userId,
        total: String(amountPaid),
        status: "completed",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeReceiptUrl: receiptUrl,
        stripeCardBrand: cardBrand,
        stripeLast4: last4,
        paidAt,
      });

      for (const item of items) {
        await db.insert(orderItems).values({
          id: uuidv4(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: String(item.price),
        });
      }

      console.log("✅ Product order complete:", orderId);
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Product Order Error:", err);
      return NextResponse.json({ received: true });
    }
  }

  /* -----------------------------------------------------------
     Unknown type
  ----------------------------------------------------------- */
  console.warn("⚠ Unknown metadata kind:", md.kind);
  return NextResponse.json({ received: true });
}
