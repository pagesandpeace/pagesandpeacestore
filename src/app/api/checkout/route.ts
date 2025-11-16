import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

// --------------------------------------------------------
// MAIN PRODUCT CHECKOUT ENDPOINT
// --------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      productName,
      price,
      imageUrl,
      productId,      // TRUE product purchase -> NOT bookingId
      successUrl,
      cancelUrl,
    } = body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------
    if (!productName || !price || !productId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // AUTH REQUIRED
    // (Guests cannot buy products at the moment)
    // --------------------------------------------------------
    const reqHeaders = Object.fromEntries(req.headers.entries());
    const session = await auth.api.getSession({ headers: reqHeaders });
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          signInUrl: "/sign-in?callbackURL=/shop",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------------
    // DETERMINE BASE URL
    // --------------------------------------------------------
    let baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "";

    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`;
    }

    // --------------------------------------------------------
    // CREATE STRIPE CHECKOUT SESSION
    // --------------------------------------------------------
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: user.email || undefined,

      // PRODUCT LINE ITEM
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(Number(price) * 100),
            product_data: {
              name: productName,
              images: imageUrl ? [imageUrl] : [],
            },
          },
          quantity: 1,
        },
      ],

      // ✔ PRODUCT SUCCESS / CANCEL pages
      success_url:
        successUrl ||
        `${baseUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: cancelUrl || `${baseUrl}/cart`,

      // ✔ PRODUCT METADATA ONLY
      metadata: {
        kind: "product",
        productId,
        userId: user.id,
      },
    });

    return NextResponse.json({ url: sessionStripe.url });
  } catch (err) {
    console.error("❌ Product checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
