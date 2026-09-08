import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

type RefundBody = {
  scope: "order" | "order_line";
  orderId: string;
  orderLineId?: string;
  refundQuantity?: number;
  reason?: string;
  notes?: string | null;
};

async function recalcOrder(orderId: string) {
  const db = appCoreDb();
  const { data: lines, error } = await db.from("order_lines").select("quantity, unit_amount_pence, refunded_quantity, refunded_amount_pence").eq("order_id", orderId);
  if (error) throw new Error(error.message);
  const gross = (lines ?? []).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_amount_pence), 0);
  const refunded = (lines ?? []).reduce((sum, line) => sum + Number(line.refunded_amount_pence ?? 0), 0);
  const refundStatus = refunded <= 0 ? "none" : refunded >= gross ? "full" : "partial";
  const { error: updateError } = await db.from("orders").update({ refund_status: refundStatus, refunded_total_pence: refunded }).eq("id", orderId);
  if (updateError) throw new Error(updateError.message);
}

function refundStateKey(lines: Array<{ id: string; refunded_quantity: number | null; refunded_amount_pence: number | null }>) {
  return lines.map((line) => `${line.id}:${Number(line.refunded_quantity ?? 0)}:${Number(line.refunded_amount_pence ?? 0)}`).sort().join("|");
}

async function updateRefundAudit(auditId: string, values: Record<string, unknown>) {
  const db = appCoreDb();
  const { error } = await db.from("refund_audit_logs").update(values).eq("id", auditId);
  if (error) throw new Error(`Could not update refund audit: ${error.message}`);
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
    const { data: order, error: orderError } = await db.from("orders").select("id, auth_user_id, status, stripe_payment_intent_id, refund_status").eq("id", body.orderId).single();
    if (orderError || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "paid" || !order.stripe_payment_intent_id) return NextResponse.json({ error: "Order is not refundable" }, { status: 400 });

    let linesQuery = db.from("order_lines").select("id, item_name, quantity, unit_amount_pence, refunded_quantity, refunded_amount_pence").eq("order_id", order.id);
    if (body.scope === "order_line") {
      if (!body.orderLineId) return NextResponse.json({ error: "Select an event item to refund" }, { status: 400 });
      linesQuery = linesQuery.eq("id", body.orderLineId);
    }

    const { data: lines, error: linesError } = await linesQuery;
    if (linesError || !lines?.length) return NextResponse.json({ error: "Refundable item not found" }, { status: 404 });

    const refundable = lines.map((line) => {
      const remainingQty = Math.max(0, Number(line.quantity) - Number(line.refunded_quantity ?? 0));
      let quantityToRefund = remainingQty;
      if (body.scope === "order_line") {
        const requested = Number(body.refundQuantity ?? remainingQty);
        if (!Number.isInteger(requested) || requested < 1 || requested > remainingQty) {
          throw new Error(`Choose between 1 and ${remainingQty} ticket${remainingQty === 1 ? "" : "s"} to refund`);
        }
        quantityToRefund = requested;
      }
      return { ...line, remainingQty, quantityToRefund, amountPence: quantityToRefund * Number(line.unit_amount_pence) };
    }).filter((line) => line.amountPence > 0);

    const amountPence = refundable.reduce((sum, line) => sum + line.amountPence, 0);
    const refundedQuantity = refundable.reduce((sum, line) => sum + line.quantityToRefund, 0);
    if (amountPence <= 0) return NextResponse.json({ error: "Nothing left to refund" }, { status: 400 });

    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, { expand: ["latest_charge"] });
    const latestCharge = paymentIntent.latest_charge;
    const charge = typeof latestCharge === "string" ? await stripe.charges.retrieve(latestCharge) : latestCharge;
    if (!charge || charge.object !== "charge") return NextResponse.json({ error: "Could not verify Stripe charge before refund" }, { status: 409 });
    const stripeRemainingPence = Math.max(0, Number(charge.amount_captured ?? charge.amount) - Number(charge.amount_refunded ?? 0));
    if (stripeRemainingPence <= 0) return NextResponse.json({ error: "Stripe shows this payment is already fully refunded. Refresh the order before trying again." }, { status: 409 });
    if (amountPence > stripeRemainingPence) return NextResponse.json({ error: `Refund exceeds Stripe refundable balance. Stripe has £${(stripeRemainingPence / 100).toFixed(2)} remaining.` }, { status: 409 });

    const { data: customer } = await db.from("customers").select("email, display_name").eq("auth_user_id", order.auth_user_id).maybeSingle();
    const { data: audit, error: auditError } = await db.from("refund_audit_logs").insert({
      order_id: order.id,
      order_line_id: body.scope === "order_line" ? body.orderLineId ?? null : null,
      scope: body.scope,
      amount_pence: amountPence,
      refunded_quantity: refundedQuantity,
      reason: body.reason?.trim() || "customer_requested",
      notes: body.notes?.trim() || null,
      status: "initiated",
      initiated_by_auth_user_id: admin.id,
      initiated_by_email: admin.email ?? null,
      customer_email: customer?.email ?? null,
      customer_name: customer?.display_name ?? null,
      email_status: "not_attempted",
    }).select("id").single();
    if (auditError || !audit) throw new Error(auditError?.message || "Could not create refund audit record");

    const stateKey = refundStateKey(refundable);
    const idempotencyKey = `app-core-refund-${order.id}-${body.scope}-${body.orderLineId ?? "all"}-${refundedQuantity}-${amountPence}-${stateKey}`.slice(0, 255);

    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: amountPence,
        metadata: {
          app_core_refund_audit_id: audit.id,
          order_id: order.id,
          scope: body.scope,
          order_line_id: body.orderLineId ?? "",
          refunded_quantity: String(refundedQuantity),
        },
      }, { idempotencyKey });
    } catch (error) {
      try {
        await updateRefundAudit(audit.id, { status: "failed", updated_at: new Date().toISOString() });
      } catch (auditUpdateError) {
        console.error("Could not mark failed refund audit", auditUpdateError);
      }
      throw error;
    }

    // Critical checkpoint: do not mutate local order/ticket state until the
    // exact Stripe refund ID is durably recorded. A retry uses the same
    // deterministic idempotency key, so Stripe will return the same refund.
    await updateRefundAudit(audit.id, {
      stripe_refund_id: refund.id,
      status: "stripe_succeeded_syncing",
      updated_at: new Date().toISOString(),
    });

    try {
      for (const line of refundable) {
        const newRefundedQty = Number(line.refunded_quantity ?? 0) + line.quantityToRefund;
        const newRefundedAmount = Number(line.refunded_amount_pence ?? 0) + line.amountPence;
        const { error: lineError } = await db.from("order_lines").update({ refunded_quantity: newRefundedQty, refunded_amount_pence: newRefundedAmount }).eq("id", line.id);
        if (lineError) throw new Error(lineError.message);

        const fullyRefunded = newRefundedQty >= Number(line.quantity);
        const { error: bookingError } = await db.from("bookings").update({ status: fullyRefunded ? "refunded" : "confirmed", updated_at: new Date().toISOString() }).eq("order_line_id", line.id);
        if (bookingError) throw new Error(bookingError.message);
      }
      await recalcOrder(order.id);
      await updateRefundAudit(audit.id, { status: "succeeded", updated_at: new Date().toISOString() });
    } catch (error) {
      try {
        await updateRefundAudit(audit.id, { status: "stripe_succeeded_sync_failed", updated_at: new Date().toISOString() });
      } catch (auditUpdateError) {
        console.error("Could not mark refund sync failure", auditUpdateError);
      }
      throw error;
    }

    let emailSent = false;
    if (customer?.email && process.env.RESEND_API_KEY) {
      try {
        const refundItem = body.scope === "order_line"
          ? `${refundable[0]?.item_name || "your event booking"} — ${refundedQuantity} ticket${refundedQuantity === 1 ? "" : "s"}`
          : refundable.length === 1 ? refundable[0].item_name : `${refundable.length} items in your order`;
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Pages & Peace <admin@pagesandpeace.co.uk>",
          to: customer.email,
          template: { id: "refund-confirmation", variables: {
            CUSTOMER_NAME: customer.display_name || "there",
            REFUND_ITEM: refundItem,
            REFUND_AMOUNT: (amountPence / 100).toFixed(2),
            ORDER_REFERENCE: order.id.slice(0, 8),
            REFUND_TYPE: body.scope === "order" ? "Full or remaining order refund" : `${refundedQuantity}-ticket event refund`,
          } },
        }, { idempotencyKey: `refund-confirmation/${audit.id}` });
        if (emailError) throw new Error(emailError.message || "Resend returned an error");
        emailSent = true;
        await updateRefundAudit(audit.id, { email_status: "sent", resend_email_id: emailData?.id ?? null, email_error: null, updated_at: new Date().toISOString() });
      } catch (emailError) {
        console.error("Refund succeeded but confirmation email failed", emailError);
        try {
          await updateRefundAudit(audit.id, { email_status: "failed", email_error: emailError instanceof Error ? emailError.message.slice(0, 500) : "Unknown email error", updated_at: new Date().toISOString() });
        } catch (auditUpdateError) {
          console.error("Could not record refund email failure", auditUpdateError);
        }
      }
    }

    return NextResponse.json({ success: true, refundId: refund.id, amountPence, refundedQuantity, emailSent });
  } catch (error) {
    console.error("App core refund failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refund failed" }, { status: 500 });
  }
}
