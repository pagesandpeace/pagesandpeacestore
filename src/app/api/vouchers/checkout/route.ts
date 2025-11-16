// app/api/vouchers/checkout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

type Delivery = "email_now" | "schedule" | "print";

interface VoucherCheckoutPayload {
  amount: number;               // pence
  toName?: string;
  fromName?: string;
  message?: string;
  delivery?: Delivery;
  sendDate?: string | null;     // ISO date or null/undefined
  buyerEmail?: string | null;
  recipientEmail?: string | null;
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PUBLIC_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
  (process.env.NEXT_PUBLIC_BASE_URL || "").trim();

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}
if (!PUBLIC_SITE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_BASE_URL)");
}

// If you want to pin an API version, you can try the literal below.
// If types ever complain (because SDK bumped LatestApiVersion), just omit apiVersion to use the account default.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});


function normalizedBaseUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as unknown;
    const {
      amount,
      toName = "",
      fromName = "",
      message = "",
      delivery = "email_now",
      sendDate = "",
      buyerEmail = "",
      recipientEmail = "",
    } = validatePayload(json);

    if (amount < 500) {
      return NextResponse.json({ error: "Minimum voucher is £5" }, { status: 400 });
    }

    const baseUrl = normalizedBaseUrl(PUBLIC_SITE_URL);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"], // Apple/Google Pay show automatically if enabled in Stripe
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Pages & Peace Gift Voucher",
              description: toName ? `For ${toName}` : "Gift Voucher",
            },
            unit_amount: amount, // already pence
          },
          quantity: 1,
        },
      ],
      customer_email: buyerEmail || undefined,
      success_url: `${baseUrl}/gift-vouchers/success?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/gift-vouchers`,
      // Stripe metadata must be string values
      metadata: {
        toName: String(toName || ""),
        fromName: String(fromName || ""),
        message: String(message || ""),
        delivery: String(delivery || "email_now"),
        sendDate: String(sendDate || ""),
        buyerEmail: String(buyerEmail || ""),
        recipientEmail: String(recipientEmail || ""),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    // no-explicit-any safe handling
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    console.error("Voucher checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Minimal runtime validation + normalization.
 * Throws on invalid payload so caller hits the catch block cleanly.
 */
function validatePayload(input: unknown): VoucherCheckoutPayload {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid JSON payload");
  }
  const obj = input as Record<string, unknown>;

  const amountRaw = obj.amount;
  const amountNum = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

  if (!Number.isFinite(amountNum)) {
    throw new Error("Invalid amount");
  }

  const deliveryRaw = obj.delivery;
  const delivery: Delivery =
    deliveryRaw === "email_now" || deliveryRaw === "schedule" || deliveryRaw === "print"
      ? deliveryRaw
      : "email_now";

  const toName = typeof obj.toName === "string" ? obj.toName : "";
  const fromName = typeof obj.fromName === "string" ? obj.fromName : "";
  const message = typeof obj.message === "string" ? obj.message : "";
  const sendDate = typeof obj.sendDate === "string" ? obj.sendDate : "";
  const buyerEmail = typeof obj.buyerEmail === "string" ? obj.buyerEmail : "";
  const recipientEmail = typeof obj.recipientEmail === "string" ? obj.recipientEmail : "";

  return {
    amount: Math.trunc(amountNum), // ensure integer pence
    toName,
    fromName,
    message,
    delivery,
    sendDate,
    buyerEmail,
    recipientEmail,
  };
}
