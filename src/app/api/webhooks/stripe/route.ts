import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  products,
  vouchers,
  guestOrders,
  guestOrderItems,
  events,
  eventBookings,
} from "@/lib/db/schema";

import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { sendVoucherEmails } from "@/lib/email/vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ✅ Set Stripe API version explicitly */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
});

/** Helper: Valid delivery types */
type Delivery = "email_now" | "schedule" | "print";

/** Helper: safe conversion */
function asDelivery(x: unknown): Delivery {
  return x === "email_now" || x === "schedule" || x === "print"
    ? x
    : "email_now";
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

/** Raw body reader */
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

/** Voucher helpers */
function generateVoucherCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick4 = () =>
    Array.from({ length: 4 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  return `PP-${pick4()}-${pick4()}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const bodyBuffer = await buffer(req.body as ReadableStream);
    event = stripe.webhooks.constructEvent(bodyBuffer, sig, secret);
  } catch (err) {
    const e = err as Error;
    console.error("❌ Webhook signature error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  /** Handle successful checkout */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const md = (session.metadata ?? {}) as Record<string, string>;

    try {
      // ------------------------------------------------------------------
      // 1. VOUCHER ORDERS (unchanged)
      // ------------------------------------------------------------------
      const isVoucher = typeof md.delivery === "string";

      if (isVoucher) {
        const amountPence = session.amount_total ?? 0;
        const buyerEmail =
          md.buyerEmail || session.customer_details?.email || "";

        const existing = await db
          .select({ id: vouchers.id })
          .from(vouchers)
          .where(eq(vouchers.stripeCheckoutSessionId, session.id))
          .limit(1);

        let createdCode: string | null = null;

        if (existing.length === 0) {
          const code = generateVoucherCode();
          const expiresAt = addMonths(new Date(), 24);

          await db.insert(vouchers).values({
            code,
            amountInitialPence: amountPence,
            amountRemainingPence: amountPence,
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

          createdCode = code;
        }

        if (createdCode) {
          await sendVoucherEmails({
            delivery: asDelivery(md.delivery),
            buyerEmail,
            recipientEmail: md.recipientEmail || null,
            toName: md.toName || null,
            fromName: md.fromName || null,
            message: md.message || null,
            code: createdCode,
            amountPence,
            currency: session.currency ?? "gbp",
            voucherUrl: `${SITE_URL}/vouchers/${createdCode}`,
            sendDateISO: md.sendDate || null,
          });
        }

        // We still continue to store any store orders below if applicable.
      }
// ------------------------------------------------------------------
// 1B. EVENT BOOKINGS (NEW)
// ------------------------------------------------------------------
const isEventBooking = md.kind === "event";

if (isEventBooking) {
  console.log("🎉 Processing event booking");

  const bookingId = md.bookingId;
  if (!bookingId) {
    console.error("Missing bookingId in metadata");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Mark booking paid
  const [booking] = await db
    .update(eventBookings)
    .set({ paid: true })
    .where(eq(eventBookings.id, bookingId))
    .returning();

  if (!booking) {
    console.error("⚠️ No booking found for", bookingId);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Get event info
  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.id, booking.eventId))
    .limit(1);

  if (!ev) {
    console.error("⚠️ Booking refers to missing event");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Get payment intent charge data
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  let receiptUrl = null;
  let cardBrand = null;
  let last4 = null;
  let paidAt = null;

  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    receiptUrl = charge?.receipt_url ?? null;
    cardBrand = charge?.payment_method_details?.card?.brand ?? null;
    last4 = charge?.payment_method_details?.card?.last4 ?? null;
    paidAt = charge?.created
      ? new Date(charge.created * 1000)
      : null;
  }

  // Create a normal order
  const orderId = uuidv4();

const [orderRow] = await db
  .insert(orders)
  .values({
    id: orderId,
    userId: booking.userId,
    total: ev.pricePence / 100,
    status: "completed",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeReceiptUrl: receiptUrl,
    stripeCardBrand: cardBrand,
    stripeLast4: last4,
    paidAt,
  })
  .returning();



  // Insert ONE event item
  await db.insert(orderItems).values({
    id: uuidv4(),
    orderId: orderRow.id,
    productId: ev.id.toString(),
    quantity: 1,
    price: ev.pricePence / 100,
  });

  console.log("🎫 Event order created:", orderRow.id);

  // stop here and don't continue into store order logic
  return NextResponse.json({ received: true }, { status: 200 });
}

      // ------------------------------------------------------------------
      // 2. STORE ORDERS (Books / Products)
      // ------------------------------------------------------------------

      // We tagged store checkouts in /api/checkout with metadata.kind = "store"
      const kind = md.kind || null;
      const mode = md.mode || null; // "user" | "guest" (from /api/checkout)

      const isStoreOrder =
        kind === "store" ||
        (!isVoucher && (md.userId || md.guestToken || mode === "guest"));

      if (!isStoreOrder) {
        // Not a store order; just acknowledge.
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Idempotency: if we already recorded this session as either a user or guest order, skip.
      const existingUserOrder = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, session.id))
        .limit(1);

      const existingGuestOrder = await db
        .select({ id: guestOrders.id })
        .from(guestOrders)
        .where(eq(guestOrders.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (existingUserOrder.length || existingGuestOrder.length) {
        console.log(
          "⚠️ Store order for this checkout session already exists. Skipping duplicate insert.",
          { sessionId: session.id }
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const total = (session.amount_total ?? 0) / 100;

      /** Stripe charge info */
      let chargeInfo: {
        receipt_url: string | null;
        paid_at: string | null;
        card_brand: string | null;
        last4: string | null;
      } | null = null;

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });

        const charge = pi.latest_charge as Stripe.Charge | null;

        chargeInfo = {
          receipt_url: charge?.receipt_url || null,
          paid_at: charge?.created
            ? new Date(charge.created * 1000).toISOString()
            : null,
          card_brand:
            charge?.payment_method_details?.card?.brand || null,
          last4: charge?.payment_method_details?.card?.last4 || null,
        };
      }

      // ---- Common line items from Stripe ----
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );

      // Decide branch based on mode/userId
      const userId = md.userId;
      const guestToken = md.guestToken || md.guest_token || null; // slight paranoia

      // -----------------------------------------------------
      // 2A. LOGGED-IN USER ORDER → orders + order_items
      // -----------------------------------------------------
      if ((mode === "user" || userId) && userId) {
        const orderId = uuidv4();

        await db.insert(orders).values({
          id: orderId,
          userId,
          total,
          status: "completed",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? null,
          stripeReceiptUrl: chargeInfo?.receipt_url ?? null,
          stripeCardBrand: chargeInfo?.card_brand ?? null,
          stripeLast4: chargeInfo?.last4 ?? null,
          paidAt: chargeInfo?.paid_at
            ? new Date(chargeInfo.paid_at)
            : null,
        });

        for (const item of lineItems.data) {
          const itemId = uuidv4();
          const quantity = item.quantity ?? 1;
          const price = item.amount_total ? item.amount_total / 100 : 0;

          const name =
            item.description ??
            item.price?.nickname ??
            "Unknown Product";

          const found = await db
            .select()
            .from(products)
            .where(eq(products.name, name))
            .limit(1);

          await db.insert(orderItems).values({
            id: itemId,
            orderId,
            productId: found[0] ? found[0].id : "unlinked",
            quantity,
            price,
          });
        }

        console.log("✅ Store order recorded for user:", {
          orderId,
          userId,
          sessionId: session.id,
        });

        return NextResponse.json({ received: true }, { status: 200 });
      }

      // -----------------------------------------------------
      // 2B. GUEST ORDER → guest_orders + guest_order_items
      // -----------------------------------------------------
      const guestEmail =
        session.customer_details?.email ||
        session.customer_email ||
        md.email ||
        "";

      if (!guestToken || !guestEmail) {
        console.warn(
          "⚠️ checkout.session.completed for guest missing guestToken or email – not recording guest order",
          { sessionId: session.id, guestToken, guestEmail }
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const guestOrderId = uuidv4();

      await db.insert(guestOrders).values({
        id: guestOrderId,
        email: guestEmail,
        guestToken,
        total,
        status: "completed",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        stripeReceiptUrl: chargeInfo?.receipt_url ?? null,
        stripeCardBrand: chargeInfo?.card_brand ?? null,
        stripeLast4: chargeInfo?.last4 ?? null,
        paidAt: chargeInfo?.paid_at
          ? new Date(chargeInfo.paid_at)
          : null,
      });

      for (const item of lineItems.data) {
        const itemId = uuidv4();
        const quantity = item.quantity ?? 1;
        const price = item.amount_total ? item.amount_total / 100 : 0;

        const name =
          item.description ??
          item.price?.nickname ??
          "Unknown Product";

        const found = await db
          .select()
          .from(products)
          .where(eq(products.name, name))
          .limit(1);

        await db.insert(guestOrderItems).values({
          id: itemId,
          guestOrderId,
          productId: found[0] ? found[0].id : "unlinked",
          quantity,
          price,
        });
      }

      console.log("✅ Guest store order recorded:", {
        guestOrderId,
        guestEmail,
        guestToken,
        sessionId: session.id,
      });

      return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
      console.error("❌ Webhook DB Error:", err);
      // We still respond 200 so Stripe doesn't keep retrying forever.
      return NextResponse.json({ received: true }, { status: 200 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
