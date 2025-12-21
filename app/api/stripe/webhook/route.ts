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
type ParsedItem = {
  productId: string;
  quantity: number;
  price: number;
};

type Metadata = {
  kind?: "product" | "cart" | "event";
  userId?: string;
  items?: string;
  eventId?: string;
  quantity?: string | number;
};

/* -----------------------------------------------------
   SAFE ITEM PARSER (PRODUCTS ONLY)
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

  const parts = md.items.split("|");
  const [productId, , qty, price] = parts;

  return [
    {
      productId,
      quantity: Number(qty),
      price: Number(price) / 100,
    },
  ];
}

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
   STRIPE PAYMENT DETAILS
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

/* -----------------------------------------------------
   RESTOCK HANDLER
----------------------------------------------------- */
async function handleRestock(event: Stripe.Event) {
  const obj =
    event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;

  const md: Metadata =
    "metadata" in obj && obj.metadata ? (obj.metadata as Metadata) : {};

  if (md.kind !== "product" && md.kind !== "cart") return;

  const items = parseItems(md);

  for (const item of items) {
    await supabase.rpc("restock_product_inventory", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
      p_reason: event.type,
      p_user_id: md.userId ?? null,
    });
  }
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
    const rawBody = await readRawBody(req.body as ReadableStream);
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /* -------------------------------
     RESTOCK EVENTS
  -------------------------------- */
  if (
    stripeEvent.type === "checkout.session.expired" ||
    stripeEvent.type === "payment_intent.canceled" ||
    stripeEvent.type === "charge.refunded"
  ) {
    await handleRestock(stripeEvent);
    return NextResponse.json({ received: true });
  }

  /* -------------------------------
     PURCHASE EVENTS
  -------------------------------- */
  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const md: Metadata = session.metadata ?? {};

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ received: true });
  }

  const orderId = crypto.randomUUID();
  const total = (session.amount_total ?? 0) / 100;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  const customerEmail = session.customer_details?.email ?? null;

  /* =====================================================
     PRODUCT / CART FLOW
  ===================================================== */
  if (md.kind === "product" || md.kind === "cart") {
    const items = parseItems(md);

    await supabase.from("orders").insert({
      id: orderId,
      user_id: md.userId,
      email: customerEmail,
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

  /* =====================================================
   EVENT FLOW (FINAL, CORRECT)
===================================================== */
if (md.kind === "event") {
  const quantity = Math.max(1, Number(md.quantity ?? 1));

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", md.eventId)
    .single();

  if (!event) {
    return NextResponse.json({ received: true });
  }

  await supabase.from("orders").insert({
    id: orderId,
    user_id: md.userId,
    email: customerEmail,
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

  // Check if there are existing event bookings for the user and event
  const { data: existingSeats } = await supabase
    .from("event_bookings")
    .select("id")
    .eq("user_id", md.userId)
    .eq("event_id", md.eventId)
    .eq("stripe_checkout_session_id", session.id)
    .limit(1);

  if (!existingSeats || existingSeats.length === 0) {
    const seats = Array.from({ length: quantity }, (_, i) => ({
      user_id: md.userId,
      event_id: md.eventId,
      stripe_checkout_session_id: session.id,
      cancelled: false,
      name: i === 0 ? null : `Guest ${i + 1}`, // Ensure guest names are inserted
    }));

    await supabase.from("event_bookings").insert(seats);
  }

  await sendOrderConfirmationEmail(orderId);
  return NextResponse.json({ received: true });
}


  return NextResponse.json({ received: true });
}
