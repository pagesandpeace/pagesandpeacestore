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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });

  const db = appCoreDb();
  const { data, error } = await db.rpc("confirm_event_checkout", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_checkout_session_id: session.id,
    p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    p_payload: { id: event.id, type: event.type, livemode: event.livemode, created: event.created },
  }).single();

  const confirmation = data as Confirmation | null;
  if (error || !confirmation) return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });

  try {
    await sendAppCoreBookingConfirmation(confirmation.order_id);
  } catch {
    return NextResponse.json({ error: "Confirmation retry required" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
