import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/* ==================================================
   POST /api/admin/refund
================================================== */
export async function POST(req: Request) {
  console.log("🔴 REFUND ROUTE HIT");

  /* ---------------- AUTH ---------------- */
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Body;
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
      return NextResponse.json({ error: "Order not refundable" }, { status: 400 });
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, price, quantity, refunded_quantity, refunded_amount, kind")
      .eq("order_id", order.id);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No refundable items" }, { status: 400 });
    }

    const refundableAmount = items.reduce((sum, item) => {
      const remaining = item.quantity - (item.refunded_quantity ?? 0);
      return sum + remaining * Number(item.price);
    }, 0);

    if (refundableAmount <= 0) {
      return NextResponse.json({ error: "Nothing left to refund" }, { status: 400 });
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

      if (item.kind === "event") {
        await supabaseAdmin
          .from("event_bookings")
          .update({
            refunded: true,
            cancelled: true,
            refund_processed_at: new Date().toISOString(),
            stripe_refund_id: refund.id,
          })
          .eq("order_item_id", item.id);
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order.id);

    return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
  }

  /* ==================================================
     🟡 SINGLE SEAT REFUND (FIXED)
  ================================================== */
  if ("bookingId" in body) {
    const { bookingId } = body;
    console.log("➡️ SINGLE SEAT REFUND:", bookingId);

    const { data: booking } = await supabaseAdmin
      .from("event_bookings")
      .select("id, refunded, order_item_id, event_id")
      .eq("id", bookingId)
      .single();

    if (!booking || booking.refunded) {
      return NextResponse.json({ error: "Booking not refundable" }, { status: 400 });
    }

    /* 🔑 FIX: derive order_item safely */
    let itemQuery = supabaseAdmin
      .from("order_items")
      .select("id, kind, order_id, price, quantity, refunded_quantity, refunded_amount");

    if (booking.order_item_id) {
      itemQuery = itemQuery.eq("id", booking.order_item_id);
    } else {
      itemQuery = itemQuery.eq("event_id", booking.event_id).eq("kind", "event");
    }

    const { data: item } = await itemQuery.single();

    if (!item) {
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
      return NextResponse.json({ error: "Order not refundable" }, { status: 400 });
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
        refund_processed_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
      })
      .eq("id", booking.id);

    await supabaseAdmin
      .from("orders")
      .update({ status: "partially_refunded" })
      .eq("id", order.id);

    console.log("🟢 SINGLE SEAT REFUND COMPLETE");

    return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
  }

  return NextResponse.json({ error: "Invalid refund request" }, { status: 400 });
}
