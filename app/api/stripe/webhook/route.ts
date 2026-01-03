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
  price: number;
};

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(req: Request) {
  logWebhook("Webhook hit");

  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    logWebhook("Missing signature or secret");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  try {
    const rawBody = await readRawBody(req.body);
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    logWebhook("Invalid signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logWebhook("Stripe event received", {
    type: stripeEvent.type,
    id: stripeEvent.id,
  });

  const isCheckoutSession =
    stripeEvent.type === "checkout.session.completed";

  const isChargeSucceeded =
    stripeEvent.type === "charge.succeeded";

  if (!isCheckoutSession && !isChargeSucceeded) {
    logWebhook("Ignoring non-target event");
    return NextResponse.json({ received: true });
  }

  const session = isCheckoutSession
    ? (stripeEvent.data.object as Stripe.Checkout.Session)
    : null;

  const md = session?.metadata ?? {};

  logWebhook("Session metadata", md);
  logWebhook("Session payment_intent", session?.payment_intent);

  if (
    isCheckoutSession &&
    (!md.userId || !md.kind)
  ) {
    logWebhook("Missing metadata on checkout.session, exiting");
    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     CHARGE SUCCEEDED (STRIPE SOURCE OF TRUTH)
  ----------------------------------------------------- */
  if (isChargeSucceeded) {
    const charge = stripeEvent.data.object as Stripe.Charge;

    logWebhook("charge.succeeded received", {
      charge_id: charge.id,
      payment_intent: charge.payment_intent,
      receipt_url: charge.receipt_url,
      brand: charge.payment_method_details?.card?.brand,
      last4: charge.payment_method_details?.card?.last4,
    });

    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : null;

    if (!paymentIntentId) {
      logWebhook("Charge has no payment_intent, exiting");
      return NextResponse.json({ received: true });
    }

    await supabase
      .from("orders")
      .update({
        stripe_receipt_url: charge.receipt_url ?? null,
        stripe_card_brand: charge.payment_method_details?.card?.brand ?? null,
        stripe_last4: charge.payment_method_details?.card?.last4 ?? null,
        paid_at: new Date(charge.created * 1000).toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntentId);

    logWebhook("Charge details attached to order (charge path)", {
      paymentIntentId,
    });

    return NextResponse.json({ received: true });
  }

  /* -----------------------------------------------------
     Advisory lock (CHECKOUT ONLY)
  ----------------------------------------------------- */
  if (isCheckoutSession && session) {
    await supabase.rpc("lock_checkout_session", {
      session_id: session.id,
    });

    logWebhook("Advisory lock acquired", session.id);
  }

  /* -----------------------------------------------------
     Resolve user (CHECKOUT ONLY)
  ----------------------------------------------------- */
  let user: { id: string } | null = null;

  if (isCheckoutSession) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", md.userId)
      .single();

    user = data ?? null;

    if (!user) {
      logWebhook("User not found", md.userId);
      return NextResponse.json({ received: true });
    }
  }

  /* -----------------------------------------------------
     Find or create order
  ----------------------------------------------------- */
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, inventory_processed, confirmation_email_sent")
    .eq("stripe_checkout_session_id", session!.id)
    .maybeSingle();

  const orderId = existingOrder?.id ?? crypto.randomUUID();

  logWebhook("Order resolution", {
    orderId,
    existing: !!existingOrder,
  });

  if (!existingOrder) {
    await supabase.from("orders").insert({
      id: orderId,
      user_id: user!.id,
      user_id_uuid: md.userId,
      total: (session!.amount_total ?? 0) / 100,
      status: "completed",
      stripe_checkout_session_id: session!.id,
      stripe_payment_intent_id:
        typeof session!.payment_intent === "string"
          ? session!.payment_intent
          : null,
      inventory_processed: false,
      confirmation_email_sent: false,
      is_test: !session!.livemode,
    });

    logWebhook("Order inserted", { orderId });
  }
  
  /* -----------------------------------------------------
   RECONCILE STRIPE CHARGE (RACE + STRIPE SAFE)
----------------------------------------------------- */
if (typeof session!.payment_intent === "string") {
  const { data: existingStripeData } = await supabase
    .from("orders")
    .select("stripe_receipt_url, stripe_card_brand, stripe_last4, paid_at")
    .eq("id", orderId)
    .single();

  const missingStripeData =
    !existingStripeData?.stripe_receipt_url ||
    !existingStripeData?.stripe_card_brand ||
    !existingStripeData?.stripe_last4;

  if (missingStripeData) {
    logWebhook("Reconciling Stripe charge after order creation", {
      orderId,
      paymentIntentId: session!.payment_intent,
    });

    const charges = await stripe.charges.list({
      payment_intent: session!.payment_intent,
      limit: 1,
    });

    const charge = charges.data[0];

    if (charge) {
      await supabase
        .from("orders")
        .update({
          stripe_receipt_url: charge.receipt_url ?? null,
          stripe_card_brand:
            charge.payment_method_details?.card?.brand ?? null,
          stripe_last4:
            charge.payment_method_details?.card?.last4 ?? null,
          paid_at: new Date(charge.created * 1000).toISOString(),
        })
        .eq("id", orderId);

      logWebhook("Stripe charge reconciled successfully", { orderId });
    } else {
      logWebhook("Stripe reconciliation found no charge", {
        paymentIntentId: session!.payment_intent,
      });
    }
  }
}


  /* -----------------------------------------------------
     ATOMIC CLAIM
  ----------------------------------------------------- */
  const { data: claim } = await supabase
    .from("orders")
    .update({ inventory_processed: true })
    .eq("id", orderId)
    .eq("inventory_processed", false)
    .select("id")
    .maybeSingle();

  if (!claim && md.kind !== "event") {
  logWebhook("Order already claimed, exiting", orderId);
  return NextResponse.json({ received: true });
}


  logWebhook("Order claimed for processing", orderId);

  /* =====================================================
     EVENT FLOW
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
      event_id: eventRow.id,
      kind: "event",
      quantity,
      price: (session!.amount_total ?? 0) / 100 / quantity,
      name: eventRow.title,
      stripe_checkout_session_id: session!.id,
    });

    const paymentIntentId =
      typeof session!.payment_intent === "string"
        ? session!.payment_intent
        : null;

    const bookerName =
      session!.customer_details?.name ||
      session!.customer_details?.email ||
      "Booker";

    const bookerEmail = session!.customer_details?.email ?? null;

    const seats = Array.from({ length: quantity }, (_, i) => ({
      user_id: user!.id,
      user_id_uuid: md.userId,
      event_id: eventRow.id,
      order_item_id: orderItemId,
      stripe_checkout_session_id: session!.id,
      stripe_payment_intent_id: paymentIntentId,
      paid: true,
      cancelled: false,
      name: i === 0 ? bookerName : `Guest ${i + 1}`,
      email: bookerEmail,
    }));

    await supabase.from("event_bookings").insert(seats);

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
      stripe_checkout_session_id: session!.id,
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
          customer_email: session!.customer_details?.email ?? null,
          customer_name: session!.customer_details?.name ?? "Online customer",
          customer_phone: session!.customer_details?.phone ?? null,
          payment_reference:
            typeof session!.payment_intent === "string"
              ? session!.payment_intent
              : session!.id,
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
      p_user_id: user!.id,
    });
  }

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
