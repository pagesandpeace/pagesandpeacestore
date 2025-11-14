// app/api/vouchers/session/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

// Use account default API version (no `any` cast). If you want to pin a version,
// uncomment the next line and ensure your installed @stripe/stripe-node supports that literal.
// const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
const stripe = new Stripe(STRIPE_SECRET_KEY);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sid = searchParams.get("sid");
    if (!sid) {
      return NextResponse.json({ error: "Missing sid" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sid);

    return NextResponse.json({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email ?? null,
      metadata: (session.metadata as Record<string, string>) ?? {},
      payment_intent: session.payment_intent ?? null,
      status: session.status ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load session";
    console.error("GET /api/vouchers/session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
