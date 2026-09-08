import { NextResponse } from "next/server";
import Stripe from "stripe";

import { appCoreDb } from "@/lib/app-core/service";
import { sendAppCoreBookingConfirmation } from "@/lib/app-core/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Confirmation = { order_id: string; should_send_confirmation: boolean };

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key, { apiVersion: "2025-11-17.clover" });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    console.warn("app_core Stripe webhook rejected: invalid signature");
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const appCoreOrderId = session.metadata?.app_core_order_id;
  console.info("app_core Stripe checkout event received", {
    eventId: event.id,
    sessionId: session.id,
    livemode: event.livemode,
    paid: session.payment_status === "paid",
    appCoreOrder: Boolean(appCoreOrderId),
  });

  if (!appCoreOrderId || session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const db = appCoreDb();
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { data, error } = await db.rpc("confirm_event_checkout", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_payload: { id: event.id, type: event.type, livemode: event.livemode, created: event.created },
  }).single();

  const confirmation = data as Confirmation | null;
  if (error || !confirmation) {
    console.error("app_core Stripe checkout processing failed", { eventId: event.id, code: error?.code });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  try {
    const stripe = stripeClient();
    const paymentIntent = paymentIntentId
      ? await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] })
      : null;
    const latestCharge = paymentIntent?.latest_charge;
    const charge = typeof latestCharge === "string"
      ? await stripe.charges.retrieve(latestCharge)
      : latestCharge && latestCharge.object === "charge"
        ? latestCharge
        : null;

    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
    const customerName = session.customer_details?.name ?? null;
    const paymentMethodType = charge?.payment_method_details?.type ?? null;
    const cardBrand = charge?.payment_method_details?.card?.brand ?? paymentMethodType;
    const cardLast4 = charge?.payment_method_details?.card?.last4 ?? null;

    const { error: orderSnapshotError } = await db.from("orders").update({
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName,
      stripe_receipt_url: charge?.receipt_url ?? null,
      stripe_card_brand: cardBrand,
      stripe_last4: cardLast4,
    }).eq("id", confirmation.order_id);
    if (orderSnapshotError) throw orderSnapshotError;

    const { error: bookingSnapshotError } = await db.from("bookings").update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName,
    }).eq("auth_user_id", session.client_reference_id).eq("status", "confirmed").is("stripe_checkout_session_id", null);
    if (bookingSnapshotError) throw bookingSnapshotError;
  } catch (snapshotError) {
    console.error("app_core payment snapshot failed", { orderId: confirmation.order_id, eventId: event.id, snapshotError });
    return NextResponse.json({ error: "Payment snapshot retry required" }, { status: 500 });
  }

  try {
    await sendAppCoreBookingConfirmation(confirmation.order_id);
  } catch {
    console.error("app_core booking confirmation email failed", { orderId: confirmation.order_id });
    return NextResponse.json({ error: "Confirmation retry required" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
