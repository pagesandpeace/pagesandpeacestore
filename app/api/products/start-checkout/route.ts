// app/api/products/start-checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------
// Stripe client
// ---------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

// ---------------------------------------------
// POST /api/products/start-checkout
// ---------------------------------------------
export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // Get logged-in user
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId, name, quantity, price, imageUrl } = body;

    if (!productId || !quantity || !price) {
      return NextResponse.json(
        { error: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Create Stripe Checkout Session
    // ---------------------------------------------
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: auth.user.email ?? undefined,

      line_items: [
        {
          quantity,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(price * 100),
            product_data: {
              name,
              images: imageUrl ? [imageUrl] : [],
            },
          },
        },
      ],

      metadata: {
        kind: "product",
        userId: auth.user.id,
        items: `${productId}|${name}|${quantity}|${Math.round(price * 100)}`,
      },

      success_url:
        `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ PRODUCT CHECKOUT ERROR:", err);
    return NextResponse.json(
      { error: err.message || "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
