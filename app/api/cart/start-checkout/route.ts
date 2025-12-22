import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // Verify the user
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    // Parse cart items
    const { items }: { items: CartItem[] } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "NO_ITEMS" },
        { status: 400 }
      );
    }

    // Build Stripe line items
    const line_items = items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(item.price * 100), // £ → pence
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
      },
    }));

    // Save metadata as a JSON string
    const metadata = {
      kind: "cart",
      userId: auth.user.id,
      items: JSON.stringify(
        items.map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.quantity,
          price: Math.round(i.price * 100),
        }))
      ),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: auth.user.email ?? undefined,
      line_items,
      metadata,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("❌ CART CHECKOUT ERROR:", err);

    const message =
      err instanceof Error ? err.message : "UNKNOWN_ERROR";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
