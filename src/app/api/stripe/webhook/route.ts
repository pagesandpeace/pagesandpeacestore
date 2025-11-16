/* FIXED + CLEAN VERSION – ALL TYPESCRIPT ERRORS REMOVED + REAL STORE ADDRESS ADDED */

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
  stores,            // ⭐ NEW: import stores table
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

type Delivery = "email_now" | "schedule" | "print";
function asDelivery(x: string | null | undefined): Delivery {
  return x === "email_now" || x === "schedule" || x === "print"
    ? x
    : "email_now";
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

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

function generateVoucherCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick4 = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `PP-${pick4()}-${pick4()}`;
}

function addMonths(date: Date, m: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d.toISOString();
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await readRawBody(req.body as ReadableStream);
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const md = session.metadata ?? {};

    try {
      /* ======================================
         VOUCHERS
      ====================================== */
      const isVoucher = typeof md.delivery === "string";

      if (isVoucher) {
        const amountPence = session.amount_total ?? 0;
        const buyerEmail =
          md.buyerEmail || session.customer_details?.email || session.customer_email || "";

        const exists = await db
          .select({ id: vouchers.id })
          .from(vouchers)
          .where(eq(vouchers.stripeCheckoutSessionId, session.id))
          .limit(1);

        if (!exists.length) {
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
              typeof session.payment_intent === "string" ? session.payment_intent : null,
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
            amountPence,
            currency: session.currency ?? "gbp",
            voucherUrl: `${SITE_URL}/vouchers/${code}`,
            sendDateISO: md.sendDate || null,
          });
        }
      }

      /* ======================================
         EVENT BOOKINGS
      ====================================== */
      if (md.kind === "event") {
        console.log("🎉 Processing event booking");

        const eventId = md.eventId;
        const userId = md.userId;
        const bookingId = md.bookingId;

        if (!eventId || !userId || !bookingId) {
          console.log("⚠ Missing metadata for event booking");
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;

        const [booking] = await db
          .insert(eventBookings)
          .values({
            id: bookingId,
            eventId,
            userId,
            paid: true,
            cancelled: false,
            email: session.customer_details?.email || session.customer_email || null,
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

        if (!ev) return NextResponse.json({ received: true }, { status: 200 });

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, ev.productId))
          .limit(1);

        /* ⭐ NEW: Fetch store address dynamically */
        const [store] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, ev.storeId))
          .limit(1);

        const storeAddress = store?.address || "Pages & Peace Bookshop";

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
          paidAt = charge?.created ? new Date(charge.created * 1000).toISOString() : null;
        }

        const orderId = uuidv4();

        await db.insert(orders).values({
          id: orderId,
          userId,
          total: String(product.price),
          status: "completed",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeReceiptUrl: receiptUrl,
          stripeCardBrand: cardBrand,
          stripeLast4: last4,
          paidAt,
        });

        await db.insert(orderItems).values({
          id: uuidv4(),
          orderId,
          productId: product.id,
          quantity: 1,
          price: String(product.price),
        });

        /* SEND EVENT CONFIRMATION EMAIL */
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
          to: booking.email || session.customer_details?.email || "",
          subject: `Your Booking: ${ev.title}`,
          html: `
            <div style="font-family: Arial; line-height: 1.6;">
              <h2>Your Pages & Peace Event Booking is Confirmed 📚</h2>
              <p>Thank you for booking with us.</p>

              <h3>Event Details</h3>
              <p><strong>Event:</strong> ${ev.title}</p>
              <p><strong>Date & Time:</strong> ${eventDate}</p>
              <p><strong>Location:</strong> ${storeAddress}</p>
              <p><strong>Booking ID:</strong> ${booking.id}</p>

              <p style="margin-top:24px;">Warm regards,<br/>Pages & Peace</p>
            </div>
          `,
        });

        return NextResponse.json({ received: true }, { status: 200 });
      }

      /* ======================================
         STORE ORDERS
      ====================================== */

      const isStoreOrder =
        md.kind === "store" || (md.userId || md.guestToken || md.mode === "guest");

      if (!isStoreOrder) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const existsUser = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, session.id))
        .limit(1);

      const existsGuest = await db
        .select({ id: guestOrders.id })
        .from(guestOrders)
        .where(eq(guestOrders.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (existsUser.length || existsGuest.length) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const total = (session.amount_total ?? 0) / 100;

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      let receipt: {
        receipt_url: string | null;
        paid_at: string | null;
        card_brand: string | null;
        last4: string | null;
      } | null = null;

      if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });
        const charge = pi.latest_charge as Stripe.Charge | null;

        receipt = {
          receipt_url: charge?.receipt_url ?? null,
          paid_at: charge?.created ? new Date(charge.created * 1000).toISOString() : null,
          card_brand: charge?.payment_method_details?.card?.brand ?? null,
          last4: charge?.payment_method_details?.card?.last4 ?? null,
        };
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      /* USER ORDER */
      if ((md.mode === "user" || md.userId) && md.userId) {
        const orderId = uuidv4();

        await db.insert(orders).values({
          id: orderId,
          userId: md.userId,
          total: String(total),
          status: "completed",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeReceiptUrl: receipt?.receipt_url ?? null,
          stripeCardBrand: receipt?.card_brand ?? null,
          stripeLast4: receipt?.last4 ?? null,
          paidAt: receipt?.paid_at ?? null,
        });

        for (const li of lineItems.data) {
          const found = await db
            .select()
            .from(products)
            .where(eq(products.name, li.description ?? "Unknown Product"))
            .limit(1);

          await db.insert(orderItems).values({
            id: uuidv4(),
            orderId,
            productId: found[0] ? found[0].id : "unlinked",
            quantity: li.quantity ?? 1,
            price: String(li.amount_total ? li.amount_total / 100 : 0),
          });
        }

        return NextResponse.json({ received: true }, { status: 200 });
      }

      /* GUEST ORDER */
      const guestEmail =
        session.customer_details?.email ||
        session.customer_email ||
        md.email ||
        "";

      const guestToken = md.guestToken ?? null;

      if (!guestEmail || !guestToken) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const guestOrderId = uuidv4();

      await db.insert(guestOrders).values({
        id: guestOrderId,
        email: guestEmail,
        guestToken,
        total: String(total),
        status: "completed",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeReceiptUrl: receipt?.receipt_url ?? null,
        stripeCardBrand: receipt?.card_brand ?? null,
        stripeLast4: receipt?.last4 ?? null,
        paidAt: receipt?.paid_at ?? null,
      });

      for (const li of lineItems.data) {
        const found = await db
          .select()
          .from(products)
          .where(eq(products.name, li.description ?? "Unknown Product"))
          .limit(1);

        await db.insert(guestOrderItems).values({
          id: uuidv4(),
          guestOrderId,
          productId: found[0] ? found[0].id : "unlinked",
          quantity: li.quantity ?? 1,
          price: String(li.amount_total ? li.amount_total / 100 : 0),
        });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
      console.error("❌ Webhook error:", err);
      return NextResponse.json({ received: true }, { status: 200 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
