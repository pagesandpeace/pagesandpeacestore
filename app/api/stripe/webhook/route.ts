import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmationEmail";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   DEBUG HELPERS
----------------------------------------------------- */
function logWebhook(message: string, data?: unknown) {
  console.log(`🔔 WEBHOOK | ${message}`, data ?? "");
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
  {
    auth: { persistSession: false },
  }
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

/* -----------------------------------------------------
   STRIPE EVENT LEDGER (NEW – DO NOT MOVE)
----------------------------------------------------- */
await supabase
  .from("stripe_events")
  .upsert({
    id: stripeEvent.id,
    type: stripeEvent.type,
    livemode: stripeEvent.livemode,
    created_at: new Date(stripeEvent.created * 1000).toISOString(),
    stripe_account: stripeEvent.account ?? null,
    api_version: stripeEvent.api_version ?? null,
    data: stripeEvent,
  })
  .throwOnError();

  

  logWebhook("Stripe event received", {
    type: stripeEvent.type,
    id: stripeEvent.id,
  });

  const isCheckoutSession =
    stripeEvent.type === "checkout.session.completed";
  const isChargeSucceeded = stripeEvent.type === "charge.succeeded";

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

  if (isCheckoutSession && (!md.userId || !md.kind)) {
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
        stripe_card_brand:
          charge.payment_method_details?.card?.brand ?? null,
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
     RECONCILE STRIPE CHARGE (RACE SAFE)
  ----------------------------------------------------- */
  if (typeof session!.payment_intent === "string") {
    const { data: existingStripeData } = await supabase
      .from("orders")
      .select(
        "stripe_receipt_url, stripe_card_brand, stripe_last4, paid_at"
      )
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

/* -----------------------------------------------------
   PRODUCT ORDER ITEM CREATION (NEW)
----------------------------------------------------- */
if (md.kind === "product") {
  if (!md.items) {
    logWebhook("❌ Product checkout missing items metadata", {
      orderId,
      metadata: md,
    });
    return NextResponse.json({ received: true });
  }

  const parts = md.items.split("|");

  if (parts.length !== 4) {
    logWebhook("❌ Invalid product items metadata format", {
      raw: md.items,
      orderId,
    });
    return NextResponse.json({ received: true });
  }

  const [productId, name, quantityRaw, priceRaw] = parts;

  const quantity = Number(quantityRaw);
  const price = Number(priceRaw) / 100;

  if (!productId || quantity <= 0 || price <= 0) {
    logWebhook("❌ Invalid product item values", {
      productId,
      quantity,
      price,
      orderId,
    });
    return NextResponse.json({ received: true });
  }

  logWebhook("📦 Creating product order_item", {
    orderId,
    productId,
    quantity,
    price,
  });

  const { error: itemErr } = await supabase.from("order_items").insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    product_id: productId,
    kind: "product",
    quantity,
    price,
    name,
    stripe_checkout_session_id: session?.id,
  });

  if (itemErr) {
    logWebhook("❌ Failed to insert product order_item", {
      orderId,
      error: itemErr,
    });
    return NextResponse.json({ received: true });
  }
}


/* -----------------------------------------------------
   CART ORDER ITEM CREATION (NEW)
----------------------------------------------------- */
if (md.kind === "cart") {
  if (!md.items) {
    logWebhook("❌ Cart checkout missing items metadata", {
      orderId,
      metadata: md,
    });
    throw new Error("Cart checkout missing items metadata");
  }

  let items: {
    productId: string;
    name: string;
    qty: number;
    price: number;
    fulfilmentMode: string;
  }[];

  try {
    items = JSON.parse(md.items);
  } catch (err) {
    logWebhook("❌ Failed to parse cart items JSON", {
      raw: md.items,
      err,
    });
    throw err;
  }

  for (const item of items) {
    if (!item.productId || item.qty <= 0 || item.price <= 0) {
      logWebhook("❌ Invalid cart item", { item, orderId });
      throw new Error("Invalid cart item");
    }

    logWebhook("🛒 Creating cart order_item", {
      orderId,
      productId: item.productId,
      quantity: item.qty,
    });

    const { error } = await supabase.from("order_items").insert({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.productId,
      kind: "product", // IMPORTANT: still product downstream
      quantity: item.qty,
      price: item.price / 100,
      name: item.name,
      stripe_checkout_session_id: session?.id,
    });

    if (error) {
      logWebhook("❌ Failed to insert cart order_item", {
        orderId,
        error,
      });
      throw error;
    }
  }
}


/* -----------------------------------------------------
   PRODUCT IDEMPOTENCY GUARD
----------------------------------------------------- */
if (md.kind === "product" || md.kind === "cart") {  const { data: existingItems } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("kind", "product")
    .limit(1);

  if (existingItems && existingItems.length > 0) {
    logWebhook("↩️ Product order_items already exist, skipping creation", {
      orderId,
    });
  }
}

/* -----------------------------------------------------
   HARD INVARIANT: PRODUCT MUST HAVE ORDER ITEMS
----------------------------------------------------- */
if (md.kind === "product" || md.kind === "cart") {  const { count } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("kind", "product");

  if (!count || count === 0) {
    logWebhook("🚨 INVARIANT VIOLATION: product order without items", {
      orderId,
      metadata: md,
    });

    // DO NOT swallow this — Stripe must retry
    throw new Error(
      `Invariant violation: product order ${orderId} has no order_items`
    );
  }
}
/* -----------------------------------------------------
   BACKORDER CREATION (PRODUCT → SUPPLIER PIPELINE)
----------------------------------------------------- */

if (md.kind === "product" || md.kind === "cart") {  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)
    .eq("kind", "product");

  if (!items || items.length === 0) {
    logWebhook("❌ No order_items found for backorder creation", {
      orderId,
    });
  } else {
    for (const item of items) {
      // HARD FK CHECK (THIS IS WHY YOU SAW 'Unknown')
      const { data: product } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", item.product_id)
        .maybeSingle();

      if (!product) {
        logWebhook("🚨 BACKORDER BLOCKED: product_id does not exist", {
          orderId,
          product_id: item.product_id,
        });
        continue; // do NOT insert broken backorders
      }

      // IDEMPOTENCY GUARD
      const { data: existing } = await supabase
        .from("customer_backorders")
        .select("id")
        .eq("order_id", orderId)
        .eq("product_id", item.product_id)
        .limit(1);

      if (existing && existing.length > 0) {
        logWebhook("↩️ Backorder already exists, skipping", {
          orderId,
          product_id: item.product_id,
        });
        continue;
      }

      await supabase.from("customer_backorders").insert({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        customer_name:
          session?.customer_details?.name ?? "Online customer",
        customer_email: session?.customer_details?.email ?? null,
        customer_phone: session?.customer_details?.phone ?? null,
        payment_status: "paid",
        status: "awaiting_order",
        notes: "Created automatically from online order",
        created_by: user!.id,
        order_date: new Date().toISOString().slice(0, 10),
      });

      logWebhook("📋 Backorder created", {
        orderId,
        product_id: item.product_id,
      });
    }
  }
}
/* -----------------------------------------------------
   PRODUCT INVENTORY PROCESSING (SAFE + IDEMPOTENT)
----------------------------------------------------- */
if (md.kind === "product" || md.kind === "cart") {  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)
    .eq("kind", "product");

  if (!items || items.length === 0) {
    logWebhook("⚠️ No product order_items found for inventory step", {
      orderId,
    });
  } else {
    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("inventory_count, fulfilment_mode")
        .eq("id", item.product_id)
        .maybeSingle();

      if (!product) {
        logWebhook("❌ Product missing during inventory processing", {
          productId: item.product_id,
        });
        continue;
      }

      if (product.fulfilment_mode === "made_to_order") {
        logWebhook("🕒 Product is made_to_order, skipping stock decrement", {
          productId: item.product_id,
        });
        continue;
      }

      const after = Number(product.inventory_count) - Number(item.quantity);

      if (after < 0) {
        logWebhook("❌ Inventory would go negative, aborting decrement", {
          productId: item.product_id,
          current: product.inventory_count,
          requested: item.quantity,
        });
        continue;
      }

      await supabase.rpc("adjust_product_inventory", {
        p_product_id: item.product_id,
        p_new_quantity: after,
        p_reason: "order",
        p_user_id: user!.id,
      });

      logWebhook("📦 Inventory decremented", {
        productId: item.product_id,
        quantity: item.quantity,
      });
    }
  }
}

  /* -----------------------------------------------------
   PRODUCT FLOW COMPLETE
----------------------------------------------------- */
if (md.kind === "product" || md.kind === "cart") {
  /* -----------------------------------------------------
     PRODUCT CONFIRMATION EMAIL (IDEMPOTENT)
  ----------------------------------------------------- */
  const { data: emailLock } = await supabase
    .from("orders")
    .update({ confirmation_email_sent: true })
    .eq("id", orderId)
    .is("confirmation_email_sent", false)
    .select("id")
    .maybeSingle();

  if (emailLock) {
    await sendOrderConfirmationEmail(orderId);
    logWebhook("📧 Product confirmation email sent", { orderId });
  } else {
    logWebhook("↩️ Product email already sent, skipping", { orderId });
  }

  logWebhook("🛍️ PRODUCT FLOW COMPLETE", {
    orderId,
    sessionId: session?.id,
  });


  return NextResponse.json({ received: true });
}


  /* =====================================================
     EVENT FLOW
  ===================================================== */
  if (md.kind === "event") {
    logWebhook("🧨 EVENT FLOW ENTERED", {
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
      sessionId: session?.id,
      orderId,
      metadata: md,
    });

    if (!md.items || !md.eventId) {
      logWebhook("❌ Missing items or eventId", md);
      return NextResponse.json({ received: true });
    }

    let items: { ticketTypeId: string; quantity: number }[];

    try {
      items = JSON.parse(md.items);
    } catch (err) {
      logWebhook("❌ Failed to parse items JSON", {
        raw: md.items,
        err,
      });
      return NextResponse.json({ received: true });
    }

    logWebhook("📦 Parsed ticket items", {
      count: items.length,
      items,
    });

    if (!items.length) {
      logWebhook("❌ No ticket items after parsing");
      return NextResponse.json({ received: true });
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, title, capacity")
      .eq("id", md.eventId)
      .maybeSingle();

    if (!event) {
      logWebhook("❌ Event not found");
      return NextResponse.json({ received: true });
    }

    const requestedSeats = items.reduce(
      (sum, i) => sum + Math.max(0, Number(i.quantity || 0)),
      0
    );

    const { count: existingSeats } = await supabase
      .from("event_bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("paid", true)
      .eq("cancelled", false);

    if ((existingSeats ?? 0) + requestedSeats > event.capacity) {
      logWebhook("❌ Capacity exceeded");
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session?.payment_intent === "string"
        ? session.payment_intent
        : null;

    const bookerName =
      session?.customer_details?.name ||
      session?.customer_details?.email ||
      "Booker";

    const bookerEmail = session?.customer_details?.email ?? null;

    let globalSeatIndex = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const { ticketTypeId, quantity } = items[idx];
      if (!ticketTypeId || quantity <= 0) continue;

      const { data: ticketType } = await supabase
        .from("event_ticket_types")
        .select("id, name, price_pence, product_id, is_active")
        .eq("id", ticketTypeId)
        .eq("event_id", event.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!ticketType || !ticketType.product_id) continue;
/* -----------------------------------------------------
   EVENT ORDER ITEM IDEMPOTENCY GUARD
----------------------------------------------------- */
const { data: existingOrderItem } = await supabase
  .from("order_items")
  .select("id")
  .eq("order_id", orderId)
  .eq("event_ticket_type_id", ticketType.id)
  .maybeSingle();

if (existingOrderItem) {
  logWebhook("↩️ Event order_item already exists, skipping", {
    orderId,
    ticketTypeId: ticketType.id,
  });
  continue;
}

      const orderItemId = crypto.randomUUID();

      const { error: insertErr } = await supabase
        .from("order_items")
        .insert({
          id: orderItemId,
          order_id: orderId,
          product_id: ticketType.product_id,
          event_id: event.id,
          event_ticket_type_id: ticketType.id,
          kind: "event",
          quantity,
          price: ticketType.price_pence / 100,
          name: `${event.title} – ${ticketType.name}`,
          stripe_checkout_session_id: session?.id,
        });

      if (insertErr) {
        logWebhook("❌ order_item insert failed", insertErr);
        continue;
      }

      const seats = Array.from({ length: quantity }, () => {
        globalSeatIndex++;
        return {
          user_id: user!.id,
          user_id_uuid: md.userId,
          event_id: event.id,
          event_ticket_type_id: ticketType.id,
          order_item_id: orderItemId,
          stripe_checkout_session_id: session?.id,
          stripe_payment_intent_id: paymentIntentId,
          paid: true,
          cancelled: false,
          price: ticketType.price_pence / 100,
          name:
            globalSeatIndex === 1
              ? bookerName
              : `Guest ${globalSeatIndex - 1}`,
          email: bookerEmail,
        };
      });

/* -----------------------------------------------------
   EVENT BOOKINGS IDEMPOTENCY GUARD
----------------------------------------------------- */
const { data: existingSeatsForItem } = await supabase
  .from("event_bookings")
  .select("id")
  .eq("order_item_id", orderItemId)
  .limit(1);

if (!existingSeatsForItem || existingSeatsForItem.length === 0) {
  await supabase.from("event_bookings").insert(seats);
} else {
  logWebhook("↩️ Event bookings already exist for order_item", {
    orderItemId,
  });
}
    }

    logWebhook("🏁 EVENT FLOW COMPLETE", {
      orderId,
      sessionId: session?.id,
    });
/* -----------------------------------------------------
   EVENT CONFIRMATION EMAIL (ORDER_ITEMS SOURCE OF TRUTH)
----------------------------------------------------- */
const { data: emailLock } = await supabase
  .from("orders")
  .update({ confirmation_email_sent: true })
  .eq("id", orderId)
  .is("confirmation_email_sent", false)
  .select("id")
  .maybeSingle();

if (emailLock) {
  logWebhook("📧 Sending EVENT confirmation email", { orderId });

  await sendOrderConfirmationEmail(orderId);

  logWebhook("📧 Event confirmation email sent", { orderId });
} else {
  logWebhook("↩️ Event confirmation email already sent", { orderId });
}

    return NextResponse.json({ received: true });
  }

 throw new Error(`Unhandled checkout kind: ${md.kind}`);


  return NextResponse.json({ received: true });
}
