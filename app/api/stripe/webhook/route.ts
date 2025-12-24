import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   Stripe
----------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

/* -----------------------------------------------------
   Supabase (SERVICE ROLE)
----------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* -----------------------------------------------------
   RAW BODY (Stripe requirement)
----------------------------------------------------- */
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

/* -----------------------------------------------------
   PAYMENT DETAILS
----------------------------------------------------- */
async function getPaymentDetails(paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge = pi.latest_charge as Stripe.Charge | null;

  return {
    stripe_receipt_url: charge?.receipt_url ?? null,
    stripe_card_brand: charge?.payment_method_details?.card?.brand ?? null,
    stripe_last4: charge?.payment_method_details?.card?.last4 ?? null,
    paid_at:
      typeof charge?.created === "number"
        ? new Date(charge.created * 1000).toISOString()
        : null,
  };
}

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req.body);
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("❌ Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};

  if (!md.userId || !md.kind) {
    console.warn("⚠️ Missing metadata, skipping", session.id);
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Idempotency
  ----------------------------------------------------- */
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Resolve internal user
  ----------------------------------------------------- */
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", md.userId)
    .single();

  if (userErr || !user) {
    console.error("❌ User resolution failed", userErr);
    return NextResponse.json({ received: true });
  }

  const orderId = crypto.randomUUID();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  const total = (session.amount_total ?? 0) / 100;

  /* -----------------------------------------------------
     Create order
  ----------------------------------------------------- */
  await supabase.from("orders").insert({
    id: orderId,
    user_id: user.id,
    user_id_uuid: md.userId,
    total,
    status: "completed",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    is_test: !session.livemode,
  });

  if (paymentIntentId) {
    const details = await getPaymentDetails(paymentIntentId);
    await supabase.from("orders").update(details).eq("id", orderId);
  }

  /* =====================================================
     EVENT FLOW
  ===================================================== */
  if (md.kind === "event") {
    const quantity = Math.max(1, Number(md.quantity ?? 1));

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, title, product_id")
      .eq("id", md.eventId)
      .single();

    if (eventErr || !eventRow || !eventRow.product_id) {
      console.error("❌ Event or product_id missing", eventErr);
      return NextResponse.json({ received: true });
    }

    const orderItemId = crypto.randomUUID();

    /* -------------------------------------------------
       Order item (PRODUCT is REQUIRED)
    ------------------------------------------------- */
    await supabase.from("order_items").insert({
      id: orderItemId,
      order_id: orderId,
      product_id: eventRow.product_id,
      event_id: eventRow.id,
      kind: "event",
      quantity,
      price: total / quantity,
      name: eventRow.title,
      stripe_checkout_session_id: session.id,
    });

    /* -------------------------------------------------
       Event bookings (1 row per seat)
    ------------------------------------------------- */
    const seats = Array.from({ length: quantity }, (_, i) => ({
      user_id: user.id,
      user_id_uuid: md.userId,
      event_id: eventRow.id,
      order_item_id: orderItemId,
      stripe_checkout_session_id: session.id,
      paid: true,
      cancelled: false,
      quantity: 1,
      name: i === 0 ? null : `Guest ${i + 1}`,
    }));

    await supabase.from("event_bookings").insert(seats);

    await sendOrderConfirmationEmail(orderId);
    return NextResponse.json({ received: true });
  }

  /* =====================================================
     PRODUCT / CART FLOW
  ===================================================== */
  if (md.items) {
    const items = JSON.parse(md.items);

    for (const item of items) {
      await supabase.from("order_items").insert({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: item.productId,
        kind: "product",
        quantity: item.qty,
        price: item.price / 100,
        stripe_checkout_session_id: session.id,
      });
    }
  }

  await sendOrderConfirmationEmail(orderId);
  return NextResponse.json({ received: true });
}
