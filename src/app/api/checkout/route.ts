import { NextResponse } from "next/server";
import Stripe from "stripe";

// ✅ Use your installed Stripe types dynamically
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: undefined,
});

type CheckoutItem = {
  name: string;
  price: number | string;
  quantity?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      items: CheckoutItem[];
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    const lineItems = body.items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity ?? 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url:
        body.successUrl ||
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/orders?status=success`,
      cancel_url:
        body.cancelUrl ||
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/orders?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("❌ Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
