import { NextResponse } from "next/server";
import Stripe from "stripe";

// ✅ Explicitly set Stripe API version (recommended by Stripe)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // @ts-expect-error Stripe type mismatch (safe to ignore)
  apiVersion: "2024-06-20",
});



type CheckoutItem = {
  name: string;
  price: number | string;
  quantity?: number;
  imageUrl?: string;
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

    // ✅ Log items for debugging
    console.log("🧾 Checkout items received:", body.items);

    const lineItems = body.items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity ?? 1,
    }));

    // ✅ Determine base URL from env
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // ✅ Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: body.successUrl || `${baseUrl}/success`,
      cancel_url: body.cancelUrl || `${baseUrl}/cancel`,
    });

    console.log("✅ Stripe session created:", session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("❌ Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
