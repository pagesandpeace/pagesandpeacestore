import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing voucher code" }, { status: 400 });
    }

    // Fetch voucher from DB
    const rows = await db.select().from(vouchers).where(eq(vouchers.code, code));

    if (!rows.length) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const v = rows[0];

    // Try to load Stripe details
    let stripeInfo = null;
    if (v.stripePaymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(v.stripePaymentIntentId);

      const charge = pi.latest_charge
        ? await stripe.charges.retrieve(pi.latest_charge as string)
        : null;

      stripeInfo = {
        chargeId: charge?.id ?? null,
        amount: charge?.amount ? charge.amount / 100 : null,
        currency: charge?.currency ?? null,
        paidAt: charge?.created ? new Date(charge.created * 1000).toISOString() : null,
        status: charge?.status ?? null,
        receiptUrl: charge?.receipt_url ?? null,
        cardBrand: charge?.payment_method_details?.card?.brand ?? null,
        cardLast4: charge?.payment_method_details?.card?.last4 ?? null,
        cardCountry: charge?.payment_method_details?.card?.country ?? null,
      };
    }

    // ---- NORMALISE VOUCHER SHAPE FOR THE FRONTEND ----
    const normalized = {
      id: v.id,
      code: v.code,

      total: v.amountInitialPence / 100,
      remaining: v.amountRemainingPence / 100,
      currency: v.currency,

      status: v.status,
      buyerEmail: v.buyerEmail,
      recipientEmail: v.recipientEmail,
      message: v.personalMessage,

      createdAt: v.createdAt,
      expiresAt: v.expiresAt,

      stripePaymentIntentId: v.stripePaymentIntentId,
      stripeCheckoutSessionId: v.stripeCheckoutSessionId,

      stripe: stripeInfo,
    };

    return NextResponse.json({ voucher: normalized });
  } catch (err) {
    console.error("GET /api/vouchers/get error:", err);
    return NextResponse.json(
      { error: "Server error loading voucher" },
      { status: 500 }
    );
  }
}
