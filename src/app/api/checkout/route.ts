import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

type CheckoutItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

type CheckoutBody = {
  items: CheckoutItem[];
};

export async function POST(req: Request) {
  try {
    let body: CheckoutBody | null = null;

    // Handle JSON or multipart form
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      const form = await req.formData();
      const raw = form.get("items");
      if (typeof raw === "string") {
        body = { items: JSON.parse(raw) as CheckoutItem[] };
      }
    }

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No items provided." }, { status: 400 });
    }

    // AUTH CHECK
    const reqHeaders = Object.fromEntries(req.headers.entries());
    const session = await auth.api.getSession({ headers: reqHeaders });
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          signInUrl: "/sign-in?callbackURL=/shop",
        },
        { status: 401 }
      );
    }

    // BASE URL
    let baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "";

    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    // STRIPE LINE ITEMS
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      body.items.map((item) => {
        const safeImage =
          item.imageUrl && item.imageUrl.startsWith("http")
            ? item.imageUrl
            : "https://pagesandpeace.co.uk/coming_soon.svg";

        return {
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(Number(item.price) * 100),
            product_data: {
              name: item.name,
              images: [safeImage],
            },
          },
          quantity: item.quantity ?? 1,
        };
      });

    // CREATE STRIPE CHECKOUT SESSION (INLINE PRICE DATA)
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      line_items: lineItems,

      success_url: `${baseUrl}/dashboard/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,

      metadata: {
        kind: "product", // REQUIRED FOR WEBHOOK MATCH
        userId: user.id,
        items: JSON.stringify(
          body.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
          }))
        ),
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (_err) {
  console.error("❌ Checkout error:", _err);
  return NextResponse.json(
    { error: "Server error", detail: String(_err) },
    { status: 500 }
    );
  }
}
