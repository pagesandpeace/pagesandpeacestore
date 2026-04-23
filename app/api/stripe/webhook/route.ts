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

/* -----------------------------------------------------
   REFUND HELPERS
----------------------------------------------------- */
async function recalcOrderStatus(orderId: string) {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("quantity, refunded_quantity, price")
    .eq("order_id", orderId);

  if (error) {
    throw new Error(`Failed to load order items for recalc: ${error.message}`);
  }

  if (!items || items.length === 0) return;

  const total = items.reduce((sum, i) => sum + i.quantity * Number(i.price), 0);

  const refunded = items.reduce(
    (sum, i) => sum + (i.refunded_quantity ?? 0) * Number(i.price),
    0
  );

  let status: "completed" | "partially_refunded" | "refunded";
  let refund_status: "none" | "partial" | "full";

  if (refunded <= 0) {
    status = "completed";
    refund_status = "none";
  } else if (refunded >= total) {
    status = "refunded";
    refund_status = "full";
  } else {
    status = "partially_refunded";
    refund_status = "partial";
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status,
      refund_status,
      refunded_total: refunded,
    })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }
}

async function handleRefundEvent(refund: Stripe.Refund) {
  const metadata = refund.metadata ?? {};
  const auditId = metadata.audit_id ?? null;
  const scope = metadata.refund_scope ?? null;

  logWebhook("Handling refund event", {
    refundId: refund.id,
    payment_intent: refund.payment_intent,
    amount: refund.amount,
    status: refund.status,
    auditId,
    scope,
    metadata,
  });

  let audit:
    | {
        id: string;
        refund_scope: "order" | "order_item" | "booking";
        order_id: string | null;
        order_item_id: string | null;
        event_booking_id: string | null;
      }
    | null = null;

  if (auditId) {
    const { data } = await supabase
      .from("refund_audit_logs")
      .select("id, refund_scope, order_id, order_item_id, event_booking_id")
      .eq("id", auditId)
      .maybeSingle();

    audit = data ?? null;
  }

  if (!audit && refund.payment_intent) {
    const paymentIntentId =
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent.id;

    const { data } = await supabase
      .from("refund_audit_logs")
      .select("id, refund_scope, order_id, order_item_id, event_booking_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    audit = data ?? null;
  }

  if (!audit) {
    logWebhook("No matching refund audit log found", {
      refundId: refund.id,
      payment_intent: refund.payment_intent,
    });
    return;
  }

  const refundStatus =
    refund.status === "failed" || refund.status === "canceled"
      ? "failed"
      : "succeeded";

  await supabase
    .from("refund_audit_logs")
    .update({
      stripe_refund_id: refund.id,
      status: refundStatus,
    })
    .eq("id", audit.id);

  if (refundStatus !== "succeeded") {
    logWebhook("Refund not succeeded, audit updated only", {
      auditId: audit.id,
      refundId: refund.id,
      status: refund.status,
    });
    return;
  }

  if (audit.refund_scope === "booking" && audit.event_booking_id && audit.order_item_id) {
    const { data: booking } = await supabase
      .from("event_bookings")
      .select("id, refunded")
      .eq("id", audit.event_booking_id)
      .maybeSingle();

    if (booking && !booking.refunded) {
      const { error: bookingUpdateError } = await supabase
        .from("event_bookings")
        .update({
          refunded: true,
          cancelled: true,
          paid: false,
          refund_processed_at: new Date().toISOString(),
          stripe_refund_id: refund.id,
        })
        .eq("id", audit.event_booking_id);

      if (bookingUpdateError) {
        throw new Error(
          `Failed to update event booking from refund webhook: ${bookingUpdateError.message}`
        );
      }
    }

    const { data: item } = await supabase
      .from("order_items")
      .select("id, refunded_quantity, price")
      .eq("id", audit.order_item_id)
      .maybeSingle();

    if (item) {
      const refundAmount = refund.amount / 100;
      const seatPrice = Number(item.price);
      const expectedQtyIncrement =
        seatPrice > 0 ? Math.max(1, Math.round(refundAmount / seatPrice)) : 1;

      const currentRefundedQty = item.refunded_quantity ?? 0;
      const desiredRefundedQty = Math.max(
        currentRefundedQty,
        currentRefundedQty + expectedQtyIncrement
      );

      // safer approach: use actual refunded bookings count for this order_item_id
      const { count: refundedBookingCount } = await supabase
        .from("event_bookings")
        .select("*", { count: "exact", head: true })
        .eq("order_item_id", audit.order_item_id)
        .eq("refunded", true);

      const finalRefundedQty = Math.max(
        desiredRefundedQty,
        refundedBookingCount ?? desiredRefundedQty
      );

      const { error: itemUpdateError } = await supabase
        .from("order_items")
        .update({
          refunded_quantity: finalRefundedQty,
          refunded_amount: finalRefundedQty * seatPrice,
        })
        .eq("id", audit.order_item_id);

      if (itemUpdateError) {
        throw new Error(
          `Failed to update order item from refund webhook: ${itemUpdateError.message}`
        );
      }
    }

    if (audit.order_id) {
      await recalcOrderStatus(audit.order_id);
    }

    logWebhook("Booking refund reconciled", {
      auditId: audit.id,
      refundId: refund.id,
      orderId: audit.order_id,
      orderItemId: audit.order_item_id,
      eventBookingId: audit.event_booking_id,
    });

    return;
  }

  if (audit.refund_scope === "order_item" && audit.order_item_id) {
    const { data: item } = await supabase
      .from("order_items")
      .select("id, refunded_quantity, price")
      .eq("id", audit.order_item_id)
      .maybeSingle();

    if (item) {
      const seatPrice = Number(item.price);
      const refundAmount = refund.amount / 100;
      const qtyIncrement =
        seatPrice > 0 ? Math.max(1, Math.round(refundAmount / seatPrice)) : 1;

      const newRefundedQty = (item.refunded_quantity ?? 0) + qtyIncrement;

      const { error: itemUpdateError } = await supabase
        .from("order_items")
        .update({
          refunded_quantity: newRefundedQty,
          refunded_amount: newRefundedQty * seatPrice,
        })
        .eq("id", audit.order_item_id);

      if (itemUpdateError) {
        throw new Error(
          `Failed to update order_item refund from webhook: ${itemUpdateError.message}`
        );
      }
    }

    if (audit.order_id) {
      await recalcOrderStatus(audit.order_id);
    }

    logWebhook("Order item refund reconciled", {
      auditId: audit.id,
      refundId: refund.id,
      orderId: audit.order_id,
      orderItemId: audit.order_item_id,
    });

    return;
  }

  if (audit.refund_scope === "order" && audit.order_id) {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, quantity, price, kind")
      .eq("order_id", audit.order_id);

    if (items) {
      for (const item of items) {
        await supabase
          .from("order_items")
          .update({
            refunded_quantity: item.quantity,
            refunded_amount: item.quantity * Number(item.price),
          })
          .eq("id", item.id);

        if (item.kind === "event") {
          await supabase
            .from("event_bookings")
            .update({
              refunded: true,
              cancelled: true,
              paid: false,
              refund_processed_at: new Date().toISOString(),
              stripe_refund_id: refund.id,
            })
            .eq("order_item_id", item.id);
        }
      }
    }

    await recalcOrderStatus(audit.order_id);

    logWebhook("Full order refund reconciled", {
      auditId: audit.id,
      refundId: refund.id,
      orderId: audit.order_id,
    });

    return;
  }

  logWebhook("Refund audit found but no matching handler path", {
    auditId: audit.id,
    scope: audit.refund_scope,
  });
}

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(req: Request) {
  console.log("🔥🔥🔥 WEBHOOK HIT (LOCAL FILE) 🔥🔥🔥");

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
     STRIPE EVENT LEDGER
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

  /* -----------------------------------------------------
     REFUND EVENTS
  ----------------------------------------------------- */
  if (
    stripeEvent.type === "refund.created" ||
    stripeEvent.type === "refund.updated"
  ) {
    const refund = stripeEvent.data.object as Stripe.Refund;
    await handleRefundEvent(refund);
    return NextResponse.json({ received: true });
  }

  if (stripeEvent.type === "charge.refunded") {
    const charge = stripeEvent.data.object as Stripe.Charge;

    // Charge may contain multiple refund objects
    const refunds = charge.refunds?.data ?? [];

    if (refunds.length > 0) {
      for (const refund of refunds) {
        await handleRefundEvent(refund);
      }
    } else {
      logWebhook("charge.refunded had no embedded refunds data", {
        chargeId: charge.id,
      });
    }

    return NextResponse.json({ received: true });
  }

  const isCheckoutSession =
    stripeEvent.type === "checkout.session.completed";
  const isChargeSucceeded = stripeEvent.type === "charge.succeeded";

  if (!isCheckoutSession && !isChargeSucceeded) {
    logWebhook("Ignoring non-target event");
    return NextResponse.json({ received: true });
  }

  let session: Stripe.Checkout.Session | null = null;
  let md: Record<string, string> = {};
  let userId: string | undefined;
  let kind = "event";

  if (isCheckoutSession) {
    session = stripeEvent.data.object as Stripe.Checkout.Session;
    md = session.metadata ?? {};
    userId = md.userId || session.client_reference_id || undefined;
    kind = md.kind || "event";

    logWebhook("Session metadata", md);
    logWebhook("Session payment_intent", session.payment_intent);

    logWebhook("FINAL METADATA RESOLUTION", {
      metadata: md,
      fallbackUserId: session.client_reference_id,
      resolvedUserId: userId,
      kind,
    });

    if (!userId) {
      logWebhook("❌ No userId found anywhere, exiting");
      return NextResponse.json({ received: true });
    }
  }

  /* -----------------------------------------------------
     CHARGE SUCCEEDED
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
      .eq("auth_user_id", userId)
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
      user_id_uuid: userId,
      customer_name: session?.customer_details?.name ?? null,
      customer_email: session?.customer_details?.email ?? null,
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
     RECONCILE STRIPE CHARGE
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

  if (!claim && kind === "event") {
    logWebhook("Event already processed — continuing for email", orderId);
  }

  logWebhook("Order claimed for processing", orderId);

  /* -----------------------------------------------------
     RESOLVE SYSTEM ADMIN
  ----------------------------------------------------- */
  const { data: systemAdmin, error: systemAdminError } = await supabase
    .from("users")
    .select("auth_user_id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (systemAdminError || !systemAdmin?.auth_user_id) {
    logWebhook("❌ No system admin auth_user_id found", systemAdminError);
    throw new Error("No system admin auth_user_id found");
  }

  /* -----------------------------------------------------
     PRODUCT ORDER ITEM CREATION
  ----------------------------------------------------- */
  if (kind === "product") {
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
     CART ORDER ITEM CREATION
  ----------------------------------------------------- */
  if (kind === "cart") {
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
        kind: "product",
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
  if (kind === "product" || kind === "cart") {
    const { data: existingItems } = await supabase
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
  if (kind === "product" || kind === "cart") {
    const { count } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("kind", "product");

    if (!count || count === 0) {
      logWebhook("🚨 INVARIANT VIOLATION: product order without items", {
        orderId,
        metadata: md,
      });

      throw new Error(
        `Invariant violation: product order ${orderId} has no order_items`
      );
    }
  }

  /* -----------------------------------------------------
     BACKORDER CREATION
  ----------------------------------------------------- */
  if (kind === "product" || kind === "cart") {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, product_id, quantity")
      .eq("order_id", orderId)
      .eq("kind", "product");

    if (!items || items.length === 0) {
      logWebhook("❌ No order_items found for backorder creation", { orderId });
    } else {
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("id, requires_procurement")
          .eq("id", item.product_id)
          .maybeSingle();

        if (!product || !product.requires_procurement) continue;

        const { data: existing } = await supabase
          .from("customer_backorders")
          .select("id")
          .eq("order_item_id", item.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error } = await supabase
          .from("customer_backorders")
          .insert({
            id: crypto.randomUUID(),
            order_id: orderId,
            order_item_id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            requested_quantity: item.quantity,
            status: "awaiting_order",
            supplier_po_id: null,
            customer_name:
              session?.customer_details?.name ?? "Online customer",
            customer_email: session?.customer_details?.email ?? null,
            customer_phone: session?.customer_details?.phone ?? null,
            payment_status: "paid",
            order_intent: "customer",
            notes: "Created automatically from online order",
            created_by: systemAdmin.auth_user_id,
            order_date: new Date().toISOString().slice(0, 10),
          });

        if (error) {
          logWebhook("❌ BACKORDER INSERT FAILED", {
            orderId,
            orderItemId: item.id,
            error,
          });
          throw error;
        }

        logWebhook("📋 Backorder created", {
          orderId,
          orderItemId: item.id,
        });
      }
    }
  }

  /* -----------------------------------------------------
     PRODUCT INVENTORY PROCESSING
  ----------------------------------------------------- */
  if (kind === "product" || kind === "cart") {
    const { data: items } = await supabase
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
  if (kind === "product" || kind === "cart") {
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
  if (kind === "event") {
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

    const { data: emailLock } = await supabase
      .from("orders")
      .update({ confirmation_email_sent: true })
      .eq("id", orderId)
      .is("confirmation_email_sent", false)
      .select("id")
      .maybeSingle();

    if (emailLock) {
      logWebhook("📧 Sending EVENT confirmation email", { orderId });

      await new Promise((res) => setTimeout(res, 300));

      await sendOrderConfirmationEmail(orderId);

      logWebhook("📧 Event confirmation email sent", { orderId });
    } else {
      logWebhook("↩️ Event confirmation email already sent", { orderId });
    }

    return NextResponse.json({ received: true });
  }

  throw new Error(`Unhandled checkout kind: ${kind}`);
}