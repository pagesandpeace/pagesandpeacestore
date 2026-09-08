import { NextResponse } from "next/server";
import Stripe from "stripe";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type RefundBody = {
  scope: "order" | "order_line";
  orderId: string;
  orderLineId?: string;
  reason?: string;
  notes?: string | null;
};

async function recalcOrder(orderId: string) {
  const db = appCoreDb();
  const { data: lines, error } = await db
    .from("order_lines")
    .select("quantity, unit_amount_pence, refunded_quantity, refunded_amount_pence")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);

  const gross = (lines ?? []).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_amount_pence), 0);
  const refunded = (lines ?? []).reduce((sum, line) => sum + Number(line.refunded_amount_pence ?? 0), 0);
  const refundStatus = refunded <= 0 ? "none" : refunded >= gross ? "full" : "partial";

  const { error: updateError } = await db
    .from("orders")
    .update({ refund_status: refundStatus, refunded_total_pence: refunded })
    .eq("id", orderId);
  if (updateError) throw new Error(updateError.message);
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as RefundBody;
    if (!body?.orderId || !["order", "order_line"].includes(body.scope)) {
      return NextResponse.json({ error: "Invalid refund request" }, { status: 400 });
    }

    const db = appCoreDb();
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, status, stripe_payment_intent_id, refund_status")
      .eq("id", body.orderId)
      .single();

    if (orderError || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "paid" || !order.stripe_payment_intent_id) {
      return NextResponse.json({ error: "Order is not refundable" }, { status: 400 });
    }

    let linesQuery = db
      .from("order_lines")
      .select("id, item_name, quantity, unit_amount_pence, refunded_quantity, refunded_amount_pence")
      .eq("order_id", order.id);
    if (body.scope === "order_line") {
      if (!body.orderLineId) return NextResponse.json({ error: "Select an event item to refund" }, { status: 400 });
      linesQuery = linesQuery.eq("id", body.orderLineId);
    }

    const { data: lines, error: linesError } = await linesQuery;
    if (linesError || !lines?.length) return NextResponse.json({ error: "Refundable item not found" }, { status: 404 });

    const refundable = lines.map((line) => {
      const remainingQty = Math.max(0, Number(line.quantity) - Number(line.refunded_quantity ?? 0));
      return { ...line, remainingQty, amountPence: remainingQty * Number(line.unit_amount_pence) };
    }).filter((line) => line.amountPence > 0);

    const amountPence = refundable.reduce((sum, line) => sum + line.amountPence, 0);
    if (amountPence <= 0) return NextResponse.json({ error: "Nothing left to refund" }, { status: 400 });

    const { data: audit, error: auditError } = await db.from("refund_audit_logs").insert({
      order_id: order.id,
      order_line_id: body.scope === "order_line" ? body.orderLineId ?? null : null,
      scope: body.scope,
      amount_pence: amountPence,
      reason: body.reason?.trim() || "customer_requested",
      notes: body.notes?.trim() || null,
      status: "initiated",
      initiated_by_auth_user_id: admin.id,
      initiated_by_email: admin.email ?? null,
    }).select("id").single();
    if (auditError || !audit) throw new Error(auditError?.message || "Could not create refund audit record");

    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: amountPence,
        metadata: {
          app_core_refund_audit_id: audit.id,
          order_id: order.id,
          scope: body.scope,
          order_line_id: body.orderLineId ?? "",
        },
      }, {
        idempotencyKey: `app-core-refund-${audit.id}`,
      });

      for (const line of refundable) {
        const newRefundedQty = Number(line.refunded_quantity ?? 0) + line.remainingQty;
        const newRefundedAmount = Number(line.refunded_amount_pence ?? 0) + line.amountPence;
        const { error: lineError } = await db.from("order_lines").update({
          refunded_quantity: newRefundedQty,
          refunded_amount_pence: newRefundedAmount,
        }).eq("id", line.id);
        if (lineError) throw new Error(lineError.message);

        const { error: bookingError } = await db.from("bookings").update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        }).eq("order_line_id", line.id);
        if (bookingError) throw new Error(bookingError.message);
      }

      await recalcOrder(order.id);
      await db.from("refund_audit_logs").update({
        stripe_refund_id: refund.id,
        status: "succeeded",
        updated_at: new Date().toISOString(),
      }).eq("id", audit.id);

      return NextResponse.json({ success: true, refundId: refund.id, amountPence });
    } catch (error) {
      await db.from("refund_audit_logs").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", audit.id);
      throw error;
    }
  } catch (error) {
    console.error("App core refund failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refund failed" }, { status: 500 });
  }
}
