import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------------------------------
   STRIPE
-------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* --------------------------------------------------
   SERVICE ROLE (BYPASS RLS)
-------------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* --------------------------------------------------
   TYPES
-------------------------------------------------- */
type Body =
  | { orderId: string }
  | { orderItemId: string }
  | { bookingId: string };

/* --------------------------------------------------
   🔧 HELPER — RECALCULATE ORDER STATUS (FIXED)
-------------------------------------------------- */
async function recalcOrderStatus(orderId: string) {
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("quantity, refunded_quantity, price")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return;

  const total = items.reduce(
    (sum, i) => sum + i.quantity * Number(i.price),
    0
  );

  const refunded = items.reduce(
    (sum, i) =>
      sum + (i.refunded_quantity ?? 0) * Number(i.price),
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

  await supabaseAdmin
    .from("orders")
    .update({
      status,
      refund_status,
      refunded_total: refunded,
    })
    .eq("id", orderId);
}

/* ==================================================
   POST /api/admin/refund
================================================== */
export async function POST(req: Request) {
  console.log("🔴 REFUND ROUTE HIT");

  /* ---------------- AUTH ---------------- */
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    body = (await req.json()) as Body;
  } else {
    const formData = await req.formData();
    body = Object.fromEntries(formData.entries()) as Body;
  }

  console.log("📦 REFUND BODY:", body);

  /* ==================================================
     🔴 FULL ORDER REFUND
  ================================================== */
  if ("orderId" in body) {
    const { orderId } = body;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, stripe_payment_intent_id")
      .eq("id", orderId)
      .single();

    if (!order || !["completed", "partially_refunded"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order not refundable" },
        { status: 400 }
      );
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, price, quantity, refunded_quantity, kind")
      .eq("order_id", order.id);

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No refundable items" },
        { status: 400 }
      );
    }

    const refundableAmount = items.reduce((sum, item) => {
      const remaining = item.quantity - (item.refunded_quantity ?? 0);
      return sum + remaining * Number(item.price);
    }, 0);

    if (refundableAmount <= 0) {
      return NextResponse.json(
        { error: "Nothing left to refund" },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id!,
      amount: Math.round(refundableAmount * 100),
    });

    for (const item of items) {
      await supabaseAdmin
        .from("order_items")
        .update({
          refunded_quantity: item.quantity,
          refunded_amount: item.quantity * Number(item.price),
        })
        .eq("id", item.id);

      if (item.kind === "event" && item.product_id) {
        await supabaseAdmin.rpc("restock_product_inventory", {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_reason: "event_refund",
          p_user_id: user.id,
        });

        await supabaseAdmin
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

    await recalcOrderStatus(order.id);

    return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
  }

  /* ==================================================
     🟡 PARTIAL PRODUCT REFUND
  ================================================== */
  if ("orderItemId" in body) {
    const { orderItemId } = body;

    const { data: item } = await supabaseAdmin
      .from("order_items")
      .select("id, kind, order_id, price, quantity, refunded_quantity")
      .eq("id", orderItemId)
      .single();

    if (!item || item.kind !== "product") {
      return NextResponse.json(
        { error: "Product item not refundable" },
        { status: 400 }
      );
    }

    const remaining = item.quantity - (item.refunded_quantity ?? 0);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "Nothing left to refund" },
        { status: 400 }
      );
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, stripe_payment_intent_id")
      .eq("id", item.order_id)
      .single();

    if (!order || !["completed", "partially_refunded"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order not refundable" },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id!,
      amount: Math.round(Number(item.price) * 100),
    });

    const newRefundedQty = (item.refunded_quantity ?? 0) + 1;

    await supabaseAdmin
      .from("order_items")
      .update({
        refunded_quantity: newRefundedQty,
        refunded_amount: newRefundedQty * Number(item.price),
      })
      .eq("id", item.id);

    await recalcOrderStatus(order.id);

    return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
  }

  /* ==================================================
     🟡 SINGLE SEAT REFUND (EVENTS)
  ================================================== */
  if ("bookingId" in body) {
    const { bookingId } = body;

    const { data: booking } = await supabaseAdmin
      .from("event_bookings")
      .select("id, refunded, order_item_id")
      .eq("id", bookingId)
      .single();

    if (!booking || booking.refunded) {
      return NextResponse.json(
        { error: "Booking not refundable" },
        { status: 400 }
      );
    }

    const { data: item } = await supabaseAdmin
      .from("order_items")
      .select(
        "id, product_id, kind, order_id, price, quantity, refunded_quantity"
      )
      .eq("id", booking.order_item_id)
      .single();

    if (!item || item.kind !== "event") {
      return NextResponse.json(
        { error: "Event order item not found" },
        { status: 404 }
      );
    }

    const remaining = item.quantity - (item.refunded_quantity ?? 0);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "No refundable seats remaining" },
        { status: 400 }
      );
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, stripe_payment_intent_id")
      .eq("id", item.order_id)
      .single();

    if (!order || !["completed", "partially_refunded"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order not refundable" },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id!,
      amount: Math.round(Number(item.price) * 100),
    });

    const newRefundedQty = (item.refunded_quantity ?? 0) + 1;

    await supabaseAdmin
      .from("order_items")
      .update({
        refunded_quantity: newRefundedQty,
        refunded_amount: newRefundedQty * Number(item.price),
      })
      .eq("id", item.id);

    await supabaseAdmin
      .from("event_bookings")
      .update({
        refunded: true,
        cancelled: true,
        paid: false,
        refund_processed_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
      })
      .eq("id", booking.id);

    await supabaseAdmin.rpc("restock_product_inventory", {
      p_product_id: item.product_id!,
      p_quantity: 1,
      p_reason: "event_refund",
      p_user_id: user.id,
    });

    await recalcOrderStatus(order.id);

    return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
  }

  return NextResponse.json({ error: "Invalid refund request" }, { status: 400 });
}
