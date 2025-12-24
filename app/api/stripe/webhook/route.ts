import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   Stripe
----------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

/* -----------------------------------------------------
   Supabase (SERVICE ROLE)
----------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* -----------------------------------------------------
   TYPES
----------------------------------------------------- */
type Metadata = {
  kind?: "product" | "cart" | "event";
  userId?: string; // auth.users.id
  items?: string;
  eventId?: string;
  quantity?: string | number;
};

type ParsedItem = {
  productId: string;
  quantity: number;
  price: number;
};

/* -----------------------------------------------------
   RAW BODY (Stripe requirement)
----------------------------------------------------- */
async function readRawBody(stream: ReadableStream | null): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/* -----------------------------------------------------
   PARSE ITEMS (PRODUCT / CART)
----------------------------------------------------- */
function parseItems(md: Metadata): ParsedItem[] {
  if (!md.items) throw new Error("Missing metadata.items");

  if (md.items.trim().startsWith("[")) {
    return JSON.parse(md.items).map(
      (item: { productId: string; qty: number; price: number }) => ({
        productId: item.productId,
        quantity: Number(item.qty),
        price: Number(item.price) / 100,
      })
    );
  }

  const [productId, , qty, price] = md.items.split("|");

  return [
    {
      productId,
      quantity: Number(qty),
      price: Number(price) / 100,
    },
  ];
}

/* -----------------------------------------------------
   PAYMENT DETAILS
----------------------------------------------------- */
async function getPaymentDetails(paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge = pi.latest_charge as Stripe.Charge | null;

  return {
    stripe_receipt_url: charge?.receipt_url ?? null,
    stripe_card_brand: charge?.payment_method_details?.card?.brand ?? null,
    stripe_last4: charge?.payment_method_details?.card?.last4 ?? null,
    paid_at:
      typeof charge?.created === "number"
        ? new Date(charge.created * 1000).toISOString()
        : null,
  };
}

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  try {
    const rawBody = await readRawBody(req.body);
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("❌ Invalid Stripe signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const md = session.metadata as Metadata;

  if (!md?.userId || !md?.kind) {
    console.warn("⚠️ Missing metadata, skipping session", session.id);
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Resolve internal user ID
  ----------------------------------------------------- */
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", md.userId)
    .single();

  if (userErr || !userRow) {
    console.error("❌ Failed to resolve user", userErr);
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Idempotency guard
  ----------------------------------------------------- */
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  const orderId = crypto.randomUUID();
  const total = (session.amount_total ?? 0) / 100;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  /* =====================================================
     EVENT FLOW
  ===================================================== */
  if (md.kind === "event") {
    const quantity = Math.max(1, Number(md.quantity ?? 1));

    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", md.eventId)
      .single();

    if (!event) {
      console.error("❌ Event not found", md.eventId);
      return NextResponse.json({ received: true });
    }

    await supabase.from("orders").insert({
      id: orderId,
      user_id: userRow.id,
      user_id_uuid: md.userId,
      total,
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    });

    if (paymentIntentId) {
      const details = await getPaymentDetails(paymentIntentId);
      await supabase.from("orders").update(details).eq("id", orderId);
    }

    await supabase.from("order_items").insert({
      id: crypto.randomUUID(),
      order_id: orderId,
      event_id: md.eventId,
      kind: "event",
      quantity,
      price: total / quantity,
      name: event.title,
    });

    const seats = Array.from({ length: quantity }, (_, i) => ({
      user_id: userRow.id,
      user_id_uuid: md.userId,
      event_id: md.eventId,
      stripe_checkout_session_id: session.id,
      paid: true,
      cancelled: false,
      quantity: 1,
      name: i === 0 ? null : `Guest ${i + 1}`,
    }));

    await supabase.from("event_bookings").insert(seats);
    await sendOrderConfirmationEmail(orderId);

    return NextResponse.json({ received: true });
  }

  /* =====================================================
     PRODUCT / CART FLOW
  ===================================================== */
  const items = parseItems(md);

  await supabase.from("orders").insert({
    id: orderId,
    user_id: userRow.id,
    user_id_uuid: md.userId,
    total,
    status: "completed",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
  });

  if (paymentIntentId) {
    const details = await getPaymentDetails(paymentIntentId);
    await supabase.from("orders").update(details).eq("id", orderId);
  }

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", item.productId)
      .single();

    await supabase.from("order_items").insert({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.productId,
      kind: "product",
      quantity: item.quantity,
      price: item.price,
      name: product?.name ?? "Product",
    });

    await supabase.rpc("decrement_product_inventory", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
      p_reason: "purchase",
      p_user_id: md.userId,
    });
  }

  await sendOrderConfirmationEmail(orderId);
  return NextResponse.json({ received: true });
}
