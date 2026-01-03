import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmationEmail";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   DEBUG HELPERS
----------------------------------------------------- */
function logWebhook(message: string, data?: unknown) {
  console.log(`🔔 WEBHOOK | ${message}`, data ?? "");
}

function logStock(message: string, data?: unknown) {
  console.log(`📦 STOCK | ${message}`, data ?? "");
}

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
   TYPES
----------------------------------------------------- */
type ParsedProductItem = {
  productId: string;
  name: string;
  qty: number;
  price: number; // pence
};

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(req: Request) {
  logWebhook("Webhook hit");

  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  try {
    const rawBody = await readRawBody(req.body);
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};

  if (!md.userId || !md.kind) {
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Advisory lock (retry safety)
  ----------------------------------------------------- */
  await supabase.rpc("lock_checkout_session", {
    session_id: session.id,
  });

  /* -----------------------------------------------------
     Resolve internal user
  ----------------------------------------------------- */
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", md.userId)
    .single();

  if (!user) return NextResponse.json({ received: true });

  /* -----------------------------------------------------
     Find or create order
  ----------------------------------------------------- */
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, inventory_processed, confirmation_email_sent")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  const orderId = existingOrder?.id ?? crypto.randomUUID();

  if (!existingOrder) {
    await supabase.from("orders").insert({
      id: orderId,
      user_id: user.id,
      user_id_uuid: md.userId,
      total: (session.amount_total ?? 0) / 100,
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      inventory_processed: false,
      confirmation_email_sent: false,
      is_test: !session.livemode,
    });
  }

  if (existingOrder?.inventory_processed) {
    logWebhook("Order already processed, exiting", orderId);
    return NextResponse.json({ received: true });
  }

  /* =====================================================
     EVENT FLOW (RESTORED – AUTHORITATIVE)
  ===================================================== */
  if (md.kind === "event") {
    logWebhook("Processing EVENT checkout");

    const quantity = Math.max(1, Number(md.quantity ?? 1));

    const { data: eventRow } = await supabase
      .from("events")
      .select("id, title, product_id")
      .eq("id", md.eventId)
      .single();

    if (!eventRow || !eventRow.product_id) {
      logWebhook("Event or product missing, skipping");
      return NextResponse.json({ received: true });
    }

    const orderItemId = crypto.randomUUID();

    await supabase.from("order_items").insert({
      id: orderItemId,
      order_id: orderId,
      product_id: eventRow.product_id,
      event_id: eventRow.id,      // 🔥 REQUIRED
      kind: "event",              // 🔥 REQUIRED
      quantity,
      price: (session.amount_total ?? 0) / 100 / quantity,
      name: eventRow.title,
      stripe_checkout_session_id: session.id,
    });

    const seats = Array.from({ length: quantity }, (_, i) => ({
      user_id: user.id,
      user_id_uuid: md.userId,
      event_id: eventRow.id,
      order_item_id: orderItemId,
      stripe_checkout_session_id: session.id,
      paid: true,
      cancelled: false,
      name: i === 0 ? null : `Guest ${i + 1}`,
    }));

    await supabase.from("event_bookings").insert(seats);

    await supabase
      .from("orders")
      .update({ inventory_processed: true })
      .eq("id", orderId);

    const { data: emailLock } = await supabase
      .from("orders")
      .update({ confirmation_email_sent: true })
      .eq("id", orderId)
      .is("confirmation_email_sent", false)
      .select("id")
      .maybeSingle();

    if (emailLock) {
      await sendOrderConfirmationEmail(orderId);
      logWebhook("Event confirmation email sent", { orderId });
    }

    return NextResponse.json({ received: true });
  }

  /* =====================================================
     PRODUCT / CART FLOW (UNCHANGED)
  ===================================================== */

  let items: ParsedProductItem[] = [];

  if (md.items?.includes("|")) {
    const [productId, name, qty, price] = md.items.split("|");
    items = [{ productId, name, qty: Number(qty), price: Number(price) }];
  } else {
    items = JSON.parse(md.items || "[]");
  }

  await supabase.from("order_items").delete().eq("order_id", orderId);

  for (const item of items) {
    await supabase.from("order_items").insert({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.productId,
      quantity: item.qty,
      price: item.price / 100,
      name: item.name,
      kind: "product",
      stripe_checkout_session_id: session.id,
    });
  }

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("inventory_count, fulfilment_mode")
      .eq("id", item.productId)
      .maybeSingle();

    if (!product) continue;

    const fulfilmentMode = product.fulfilment_mode?.trim();

    if (fulfilmentMode === "made_to_order") {
      await supabase.from("customer_backorders").upsert(
        {
          order_id: orderId,
          product_id: item.productId,
          quantity: item.qty,
          payment_status: "paid",
          status: "awaiting_order",
          order_date: new Date().toISOString().slice(0, 10),
          customer_email: session.customer_details?.email ?? null,
          customer_name: session.customer_details?.name ?? "Online customer",
          customer_phone: session.customer_details?.phone ?? null,
          payment_reference:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.id,
          notes: "Created automatically from online order",
          created_by: md.userId,
        },
        { onConflict: "order_id,product_id" }
      );
      continue;
    }

    const after = Number(product.inventory_count) - item.qty;
    if (after < 0) return NextResponse.json({ received: true });

    await supabase.rpc("adjust_product_inventory", {
      p_product_id: item.productId,
      p_new_quantity: after,
      p_reason: "order",
      p_user_id: user.id,
    });
  }

  await supabase
    .from("orders")
    .update({ inventory_processed: true })
    .eq("id", orderId);

  const { data: emailLock } = await supabase
    .from("orders")
    .update({ confirmation_email_sent: true })
    .eq("id", orderId)
    .is("confirmation_email_sent", false)
    .select("id")
    .maybeSingle();

  if (emailLock) {
    await sendOrderConfirmationEmail(orderId);
    logWebhook("Order confirmation email sent", { orderId });
  }

  return NextResponse.json({ received: true });
}
