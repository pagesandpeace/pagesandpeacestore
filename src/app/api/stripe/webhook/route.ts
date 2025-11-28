/* ===========================================================
   FINAL MERGED STRIPE WEBHOOK
   VOUCHERS + EVENTS + PRODUCT ORDERS
   WITH FULL INVENTORY REDUCTION (SAFE)
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
  products,
} from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { sendVoucherEmails } from "@/lib/email/vouchers";
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmationEmail";
import { sendEventConfirmationEmail } from "@/lib/email/sendEventConfirmationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

/* -------------------------------------------------------
   RAW BODY READER (Stripe-required)
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
   WEBHOOK HANDLER
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

  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};
  const amountPaidPence = session.amount_total ?? 0;
  const amountPaid = amountPaidPence / 100;

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
          amountInitialPence: amountPaidPence,
          amountRemainingPence: amountPaidPence,
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
          amountPence: amountPaidPence,
          currency: session.currency ?? "gbp",
          voucherUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/vouchers/${code}`,
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
      if (!eventId || !userId || !bookingId)
        return NextResponse.json({ received: true });

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      const [booking] = await db
        .insert(eventBookings)
        .values({
          id: bookingId,
          eventId,
          userId,
          paid: true,
          cancelled: false,
          email:
            session.customer_details?.email ||
            session.customer_email ||
            null,
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

      let receiptUrl: string | null = null;
      let cardBrand: string | null = null;
      let last4: string | null = null;
      let paidAtISO: string | null = null;

      if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });

        const charge = pi.latest_charge as Stripe.Charge | null;
        receiptUrl = charge?.receipt_url ?? null;
        cardBrand = charge?.payment_method_details?.card?.brand ?? null;
        last4 = charge?.payment_method_details?.card?.last4 ?? null;
        paidAtISO = charge?.created
          ? new Date(charge.created * 1000).toISOString()
          : null;
      }

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
        paidAt: paidAtISO,
        createdAt: new Date().toISOString(),
      });

      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId,
        productId: ev.productId,
        quantity: 1,
        price: String(amountPaid),
      });

      await sendEventConfirmationEmail({
        to: booking.email!,
        event: {
          id: ev.id,
          title: ev.title,
          date: ev.date,
          storeName: store?.name ?? "Pages & Peace",
          storeAddress: store?.address ?? "Address unavailable",
          storeChapter: store?.chapter ?? null,
          imageUrl: ev.imageUrl,
        },
        booking: {
          id: booking.id,
          name: booking.name,
          email: booking.email,
        },
        order: {
          id: orderId,
          paidAt: paidAtISO,
          amount: String(amountPaid),
          receiptUrl,
          cardBrand,
          last4,
        },
      });

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Event Flow Error:", err);
      return NextResponse.json({ received: true });
    }
  }

  /* ============================================================
   FLOW 3 — PRODUCT ORDERS (WITH INVENTORY UPDATE)
   FIX: ensure product flow triggers even if Stripe strips 'kind'
============================================================ */
if (
  md.kind === "product" ||
  (typeof md.items === "string" && md.items.includes("|"))
) {

    try {
      const userId = md.userId;
      const raw = md.items;

      if (!userId || !raw || typeof raw !== "string") {
        return NextResponse.json({ received: true });
      }

      /* -------------------------------------------------------
         PARSE SAFE METADATA FORMAT:
         "p123|Book Name|1|999,e456|Tote Bag|2|1000"
      ------------------------------------------------------- */
      const items = raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [productId, name, qtyStr, priceStr] = entry.split("|");
          return {
            productId,
            name,
            quantity: Number(qtyStr),
            pricePence: Number(priceStr),
          };
        });

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      let pi: Stripe.PaymentIntent | null = null;

      if (paymentIntentId) {
        pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });
      }

      const charge = pi?.latest_charge as Stripe.Charge | null;

      const receiptUrl = charge?.receipt_url ?? null;
      const cardBrand = charge?.payment_method_details?.card?.brand ?? null;
      const last4 = charge?.payment_method_details?.card?.last4 ?? null;
      const paidAtISO = charge?.created
        ? new Date(charge.created * 1000).toISOString()
        : null;

      /* -------------------------------------------------------
         IDEMPOTENCY — DO NOT CREATE ORDER TWICE
      ------------------------------------------------------- */
      const existing = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (existing.length) {
        return NextResponse.json({ received: true });
      }

      const orderId = uuidv4();
      const createdAtISO = new Date().toISOString();

      /* -------------------------------------------------------
         CREATE ORDER
      ------------------------------------------------------- */
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
        paidAt: paidAtISO,
        createdAt: createdAtISO,
      });

      const formattedEmailItems = [];

      /* -------------------------------------------------------
         INSERT ORDER ITEMS + REDUCE INVENTORY
      ------------------------------------------------------- */
      for (const item of items) {
        await db.insert(orderItems).values({
          id: uuidv4(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: (item.pricePence / 100).toString(),
        });

        /* ----- NEW: Reduce Inventory ----- */
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product) {
          const newStock = Math.max(
            0,
            Number(product.inventory_count) - Number(item.quantity)
          );

          await db
            .update(products)
            .set({
              inventory_count: newStock,
            })
            .where(eq(products.id, item.productId));
        }

        formattedEmailItems.push({
          name: item.name,
          quantity: item.quantity,
          price: item.pricePence,
        });
      }

      /* -------------------------------------------------------
         SEND ORDER CONFIRMATION EMAIL
      ------------------------------------------------------- */
      await sendOrderConfirmationEmail({
        email: session.customer_details?.email || "",
        orderId,
        total: amountPaidPence,
        lineItems: formattedEmailItems,
        createdAt: createdAtISO,
      });

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("❌ Product Order Error:", err);
      return NextResponse.json({ received: true });
    }
  }

  return NextResponse.json({ received: true });
}
