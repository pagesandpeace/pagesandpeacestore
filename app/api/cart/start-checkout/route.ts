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

    /* --------------------------------------------
       AUTH
    -------------------------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    /* --------------------------------------------
       BODY
    -------------------------------------------- */
    const { items }: { items: CartItem[] } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "NO_ITEMS" },
        { status: 400 }
      );
    }

    /* --------------------------------------------
       FETCH FULFILMENT MODES (CRITICAL FIX)
    -------------------------------------------- */
    const productIds = items.map((i) => i.productId);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, fulfilment_mode")
      .in("id", productIds);

    if (productsError) {
      console.error("❌ Failed to fetch products", productsError);
      return NextResponse.json(
        { error: "PRODUCT_LOOKUP_FAILED" },
        { status: 500 }
      );
    }

    const fulfilmentMap = Object.fromEntries(
      (products ?? []).map((p) => [p.id, p.fulfilment_mode])
    );

    /* --------------------------------------------
       STRIPE LINE ITEMS
    -------------------------------------------- */
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

    /* --------------------------------------------
       METADATA (SOURCE OF TRUTH)
    -------------------------------------------- */
    const metadata = {
      kind: "cart",
      userId: auth.user.id,
      items: JSON.stringify(
        items.map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.quantity,
          price: Math.round(i.price * 100),
          fulfilmentMode: fulfilmentMap[i.productId] ?? "physical",
        }))
      ),
    };

    /* --------------------------------------------
       STRIPE SESSION
    -------------------------------------------- */
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
  } catch (err) {
    console.error("❌ CART CHECKOUT ERROR:", err);

    return NextResponse.json(
      { error: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
