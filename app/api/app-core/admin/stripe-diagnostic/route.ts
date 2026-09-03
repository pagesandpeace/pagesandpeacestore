import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key, { apiVersion: "2025-11-17.clover" });
}

/**
 * Temporary read-only Preview diagnostic. It never exposes a secret, customer
 * data, or payment details; it proves which Stripe account this deployment uses.
 */
export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 });
  }

  try {
    const stripe = stripeClient();
    const account = await stripe.accounts.retrieve();

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return NextResponse.json({
        stripe_account_id: account.id,
        test_mode: !session.livemode,
        session_found: true,
        session_id: session.id,
        payment_status: session.payment_status,
        checkout_status: session.status,
        app_core_order: Boolean(session.metadata?.app_core_order_id),
      }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        return NextResponse.json({
          stripe_account_id: account.id,
          session_found: false,
        }, { headers: { "Cache-Control": "private, no-store" } });
      }
      throw error;
    }
  } catch {
    return NextResponse.json({ error: "STRIPE_DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
  }
}
