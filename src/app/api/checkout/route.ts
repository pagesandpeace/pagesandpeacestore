import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth"; // ✅ required for direct BetterAuth session

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

type CheckoutItem = {
  name: string;
  price: number | string;
  quantity?: number;
  imageUrl?: string;
};

type CheckoutBody = {
  items: CheckoutItem[];
  successUrl?: string;
  cancelUrl?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutBody;

    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    /* ----------------------------------------------------------
     * ✅ FIX: MANUALLY READ BETTERAUTH SESSION INSIDE API ROUTE
     * ---------------------------------------------------------- */
    const reqHeaders = Object.fromEntries(req.headers.entries());

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    const user = session?.user ?? null;

    /* ----------------------------------------------------------
     * BASE URL FOR STRIPE REDIRECTS
     * ---------------------------------------------------------- */
    let baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "";

    if (!baseUrl) {
      throw new Error(
        "Missing NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_BASE_URL in environment variables."
      );
    }

    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`;
    }

    /* ----------------------------------------------------------
     * STRIPE LINE ITEMS
     * ---------------------------------------------------------- */
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

    /* ----------------------------------------------------------
     * GUEST TOKEN LOGIC (only if NO user)
     * ---------------------------------------------------------- */
    const cookieStore = await cookies();
    let guestToken = cookieStore.get("pp_guest_token")?.value || null;
    let createdNewGuestToken = false;

    if (!user && !guestToken) {
      guestToken = uuidv4();
      createdNewGuestToken = true;
    }

    /* ----------------------------------------------------------
     * STRIPE METADATA (controls webhook behavior)
     * ---------------------------------------------------------- */
    const metadata: Record<string, string> = {
      kind: "store",
    };

    if (user) {
      metadata.mode = "user";          // REQUIRED
      metadata.userId = user.id;        // REQUIRED
    } else if (guestToken) {
      metadata.mode = "guest";
      metadata.guestToken = guestToken;
    }

    /* ----------------------------------------------------------
     * CREATE STRIPE CHECKOUT SESSION
     * ---------------------------------------------------------- */
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,

      customer_email: user?.email ?? undefined,

      success_url: body.successUrl || `${baseUrl}/success`,
      cancel_url: body.cancelUrl || `${baseUrl}/cancel`,

      metadata,
    });

    /* ----------------------------------------------------------
     * ATTACH GUEST COOKIE ONLY IF NEW
     * ---------------------------------------------------------- */
    const res = NextResponse.json({ url: sessionStripe.url });

    if (!user && createdNewGuestToken && guestToken) {
      res.cookies.set("pp_guest_token", guestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (error: unknown) {
    console.error("❌ Stripe checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
