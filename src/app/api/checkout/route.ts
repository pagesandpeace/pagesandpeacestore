import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

type CheckoutItem = {
  productId: string;
  name: string;
  price: number;      // price in POUNDS
  quantity: number;
  imageUrl?: string;
};

type CheckoutBody = {
  items: CheckoutItem[];
};

export async function POST(req: Request) {
  try {
    let body: CheckoutBody | null = null;

    // Try JSON
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      // Fallback for multipart
      const form = await req.formData();
      const raw = form.get("items");
      if (typeof raw === "string") {
        body = { items: JSON.parse(raw) as CheckoutItem[] };
      }
    }

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No items provided." }, { status: 400 });
    }

    /* ============================================================
       AUTH
    ============================================================ */
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

    /* ============================================================
       BASE URL
    ============================================================ */
    let baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
      "";

    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    /* ============================================================
       1. STOCK VALIDATION (SERVER TRUTH)
       Prevents overselling & race conditions
    ============================================================ */

    const productIds = body.items.map((i) => i.productId);

    const stockRows = await db
      .select({
        id: products.id,
        inventory: products.inventory_count,
        name: products.name,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const stockMap: Record<string, { inventory: number; name: string }> = {};
    for (const row of stockRows) {
      stockMap[row.id] = { inventory: row.inventory, name: row.name };
    }

    for (const item of body.items) {
      const stock = stockMap[item.productId]?.inventory ?? 0;
      const name = stockMap[item.productId]?.name ?? item.name;

      if (stock <= 0) {
        return NextResponse.json(
          {
            error: `Sorry, "${name}" is now out of stock.`,
            code: "OUT_OF_STOCK",
            productId: item.productId,
          },
          { status: 400 }
        );
      }

      if (item.quantity > stock) {
        return NextResponse.json(
          {
            error: `Only ${stock} left for "${name}". Please reduce quantity.`,
            code: "INSUFFICIENT_STOCK",
            productId: item.productId,
          },
          { status: 400 }
        );
      }
    }

    /* ============================================================
       2. STRIPE LINE ITEMS
    ============================================================ */

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

    /* ============================================================
       3. STRIPE-SAFE METADATA
    ============================================================ */

    const metadataString = body.items
      .map((i) => {
        const pricePence = Math.round(i.price * 100);
        return `${i.productId}|${i.name}|${i.quantity}|${pricePence}`;
      })
      .join(",");

    /* ============================================================
       4. CREATE CHECKOUT SESSION
    ============================================================ */

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      line_items: lineItems,

      success_url: `${baseUrl}/dashboard/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,

      metadata: {
        kind: "product",
        userId: user.id,
        items: metadataString,
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (err) {
    console.error("❌ Checkout error:", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
