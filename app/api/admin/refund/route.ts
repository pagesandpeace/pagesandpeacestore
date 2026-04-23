import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type RefundReason =
  | "customer_requested_cancellation"
  | "duplicate_booking"
  | "admin_error"
  | "event_cancelled"
  | "goodwill"
  | "other";

type Body =
  | {
      orderId: string;
      reason?: RefundReason;
      notes?: string | null;
    }
  | {
      orderItemId: string;
      reason?: RefundReason;
      notes?: string | null;
    }
  | {
      bookingId: string;
      reason?: RefundReason;
      notes?: string | null;
    };

type RefundAuditInsert = {
  refund_scope: "order" | "order_item" | "booking";
  order_id?: string | null;
  order_item_id?: string | null;
  event_booking_id?: string | null;
  initiated_by_auth_user_id?: string | null;
  initiated_by_email?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
  amount: number;
  reason?: string | null;
  notes?: string | null;
  status: "initiated" | "succeeded" | "failed";
};

async function recalcOrderStatus(orderId: string) {
  const { data: items, error } = await supabaseAdmin
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

  const { error: updateError } = await supabaseAdmin
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

async function createRefundAuditLog(payload: RefundAuditInsert) {
  const { data, error } = await supabaseAdmin
    .from("refund_audit_logs")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create refund audit log: ${error.message}`);
  }

  return data.id as string;
}

async function updateRefundAuditLog(
  auditId: string,
  updates: Partial<RefundAuditInsert>
) {
  const { error } = await supabaseAdmin
    .from("refund_audit_logs")
    .update(updates)
    .eq("id", auditId);

  if (error) {
    throw new Error(`Failed to update refund audit log: ${error.message}`);
  }
}

function sanitizeReason(reason?: RefundReason) {
  if (!reason) return "other";
  return reason;
}

function sanitizeNotes(notes?: string | null) {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
}

async function safeRestockInventory(params: {
  productId: string | null | undefined;
  quantity: number;
  userId: string;
}) {
  if (!params.productId || params.quantity <= 0) return;

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, inventory_count, fulfilment_mode")
    .eq("id", params.productId)
    .maybeSingle();

  if (productError) {
    throw new Error(`Failed to load product for restock: ${productError.message}`);
  }

  if (!product) {
    console.warn("⚠ Product not found during refund restock", {
      productId: params.productId,
    });
    return;
  }

  if (product.fulfilment_mode === "made_to_order") {
    console.warn("⚠ Skipping restock for made_to_order product", {
      productId: params.productId,
    });
    return;
  }

  const currentInventory = Number(product.inventory_count ?? 0);
  const newQuantity = currentInventory + Number(params.quantity);

  const { error: adjustError } = await supabaseAdmin.rpc(
    "adjust_product_inventory",
    {
      p_product_id: params.productId,
      p_new_quantity: newQuantity,
      p_reason: "refund",
      p_user_id: params.userId,
    }
  );

  if (adjustError) {
    throw new Error(`Failed to restock refunded inventory: ${adjustError.message}`);
  }

  console.log("✅ Inventory restocked after refund", {
    productId: params.productId,
    addedBack: params.quantity,
    newQuantity,
  });
}

export async function POST(req: Request) {
  try {
    console.log("🔴 REFUND ROUTE HIT");

    const supabase = await supabaseAuthServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, email")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Body;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = (await req.json()) as Body;
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries()) as unknown as Body;
    }

    console.log("📦 REFUND BODY:", body);

    const reason = sanitizeReason(body.reason);
    const notes = sanitizeNotes(body.notes);

    if ("orderId" in body) {
      const { orderId } = body;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select(
          "id, status, stripe_payment_intent_id, customer_name, customer_email"
        )
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (!["completed", "partially_refunded"].includes(order.status)) {
        return NextResponse.json(
          { error: "Order not refundable" },
          { status: 400 }
        );
      }

      const { data: items, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("id, product_id, price, quantity, refunded_quantity, kind")
        .eq("order_id", order.id);

      if (itemsError) {
        return NextResponse.json(
          { error: "Failed to load order items" },
          { status: 500 }
        );
      }

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

      const auditId = await createRefundAuditLog({
        refund_scope: "order",
        order_id: order.id,
        order_item_id: null,
        event_booking_id: null,
        initiated_by_auth_user_id: user.id,
        initiated_by_email: profile.email ?? null,
        customer_name: order.customer_name ?? null,
        customer_email: order.customer_email ?? null,
        stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
        amount: refundableAmount,
        reason,
        notes,
        status: "initiated",
      });

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_intent_id!,
            amount: Math.round(refundableAmount * 100),
            metadata: {
              audit_id: auditId,
              refund_scope: "order",
              order_id: order.id,
              initiated_by_auth_user_id: user.id,
              reason,
            },
          },
          {
            idempotencyKey: `refund-order-${order.id}-${Math.round(
              refundableAmount * 100
            )}`,
          }
        );

        for (const item of items) {
          const { error: itemUpdateError } = await supabaseAdmin
            .from("order_items")
            .update({
              refunded_quantity: item.quantity,
              refunded_amount: item.quantity * Number(item.price),
            })
            .eq("id", item.id);

          if (itemUpdateError) {
            throw new Error(itemUpdateError.message);
          }

          if (item.kind === "event") {
            const { error: bookingUpdateError } = await supabaseAdmin
              .from("event_bookings")
              .update({
                refunded: true,
                cancelled: true,
                paid: false,
                refund_processed_at: new Date().toISOString(),
                stripe_refund_id: refund.id,
              })
              .eq("order_item_id", item.id);

            if (bookingUpdateError) {
              throw new Error(bookingUpdateError.message);
            }

            await safeRestockInventory({
              productId: item.product_id,
              quantity: item.quantity,
              userId: user.id,
            });
          }
        }

        await recalcOrderStatus(order.id);

        await updateRefundAuditLog(auditId, {
          stripe_refund_id: refund.id,
          status: "succeeded",
        });

        return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
      } catch (error) {
        await updateRefundAuditLog(auditId, { status: "failed" });
        throw error;
      }
    }

    if ("orderItemId" in body) {
      const { orderItemId } = body;

      const { data: item, error: itemError } = await supabaseAdmin
        .from("order_items")
        .select("id, kind, order_id, price, quantity, refunded_quantity")
        .eq("id", orderItemId)
        .single();

      if (itemError || !item) {
        return NextResponse.json(
          { error: "Product item not found" },
          { status: 404 }
        );
      }

      if (item.kind !== "product") {
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

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select(
          "id, status, stripe_payment_intent_id, customer_name, customer_email"
        )
        .eq("id", item.order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (!["completed", "partially_refunded"].includes(order.status)) {
        return NextResponse.json(
          { error: "Order not refundable" },
          { status: 400 }
        );
      }

      const auditId = await createRefundAuditLog({
        refund_scope: "order_item",
        order_id: order.id,
        order_item_id: item.id,
        event_booking_id: null,
        initiated_by_auth_user_id: user.id,
        initiated_by_email: profile.email ?? null,
        customer_name: order.customer_name ?? null,
        customer_email: order.customer_email ?? null,
        stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
        amount: Number(item.price),
        reason,
        notes,
        status: "initiated",
      });

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_intent_id!,
            amount: Math.round(Number(item.price) * 100),
            metadata: {
              audit_id: auditId,
              refund_scope: "order_item",
              order_id: order.id,
              order_item_id: item.id,
              initiated_by_auth_user_id: user.id,
              reason,
            },
          },
          {
            idempotencyKey: `refund-order-item-${item.id}-${
              (item.refunded_quantity ?? 0) + 1
            }`,
          }
        );

        const newRefundedQty = (item.refunded_quantity ?? 0) + 1;

        const { error: updateItemError } = await supabaseAdmin
          .from("order_items")
          .update({
            refunded_quantity: newRefundedQty,
            refunded_amount: newRefundedQty * Number(item.price),
          })
          .eq("id", item.id);

        if (updateItemError) {
          throw new Error(updateItemError.message);
        }

        await recalcOrderStatus(order.id);

        await updateRefundAuditLog(auditId, {
          stripe_refund_id: refund.id,
          status: "succeeded",
        });

        return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
      } catch (error) {
        await updateRefundAuditLog(auditId, { status: "failed" });
        throw error;
      }
    }

    if ("bookingId" in body) {
      const { bookingId } = body;

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("event_bookings")
        .select(
          "id, refunded, cancelled, paid, order_item_id, name, email, stripe_payment_intent_id"
        )
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.refunded || booking.cancelled) {
        return NextResponse.json(
          { error: "Booking not refundable" },
          { status: 400 }
        );
      }

      const { data: item, error: itemError } = await supabaseAdmin
        .from("order_items")
        .select(
          "id, product_id, kind, order_id, price, quantity, refunded_quantity"
        )
        .eq("id", booking.order_item_id)
        .single();

      if (itemError || !item) {
        return NextResponse.json(
          { error: "Event order item not found" },
          { status: 404 }
        );
      }

      if (item.kind !== "event") {
        return NextResponse.json(
          { error: "This booking is not linked to an event item" },
          { status: 400 }
        );
      }

      const remaining = item.quantity - (item.refunded_quantity ?? 0);
      if (remaining <= 0) {
        return NextResponse.json(
          { error: "No refundable seats remaining" },
          { status: 400 }
        );
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select(
          "id, status, stripe_payment_intent_id, customer_name, customer_email"
        )
        .eq("id", item.order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (!["completed", "partially_refunded"].includes(order.status)) {
        return NextResponse.json(
          { error: "Order not refundable" },
          { status: 400 }
        );
      }

      const refundAmount = Number(item.price);

      const auditId = await createRefundAuditLog({
        refund_scope: "booking",
        order_id: order.id,
        order_item_id: item.id,
        event_booking_id: booking.id,
        initiated_by_auth_user_id: user.id,
        initiated_by_email: profile.email ?? null,
        customer_name: booking.name ?? order.customer_name ?? null,
        customer_email: booking.email ?? order.customer_email ?? null,
        stripe_payment_intent_id:
          order.stripe_payment_intent_id ??
          booking.stripe_payment_intent_id ??
          null,
        amount: refundAmount,
        reason,
        notes,
        status: "initiated",
      });

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_intent_id!,
            amount: Math.round(refundAmount * 100),
            metadata: {
              audit_id: auditId,
              refund_scope: "booking",
              booking_id: booking.id,
              order_id: order.id,
              order_item_id: item.id,
              initiated_by_auth_user_id: user.id,
              reason,
            },
          },
          {
            idempotencyKey: `refund-booking-${booking.id}-${
              (item.refunded_quantity ?? 0) + 1
            }`,
          }
        );

        const newRefundedQty = (item.refunded_quantity ?? 0) + 1;

        const { error: updateItemError } = await supabaseAdmin
          .from("order_items")
          .update({
            refunded_quantity: newRefundedQty,
            refunded_amount: newRefundedQty * Number(item.price),
          })
          .eq("id", item.id);

        if (updateItemError) {
          throw new Error(updateItemError.message);
        }

        const { error: bookingUpdateError } = await supabaseAdmin
          .from("event_bookings")
          .update({
            refunded: true,
            cancelled: true,
            paid: false,
            refund_processed_at: new Date().toISOString(),
            stripe_refund_id: refund.id,
          })
          .eq("id", booking.id);

        if (bookingUpdateError) {
          throw new Error(bookingUpdateError.message);
        }

        await safeRestockInventory({
          productId: item.product_id,
          quantity: 1,
          userId: user.id,
        });

        await recalcOrderStatus(order.id);

        await updateRefundAuditLog(auditId, {
          stripe_refund_id: refund.id,
          status: "succeeded",
        });

        return NextResponse.json({ ok: true, stripe_refund_id: refund.id });
      } catch (error) {
        await updateRefundAuditLog(auditId, { status: "failed" });
        throw error;
      }
    }

    return NextResponse.json({ error: "Invalid refund request" }, { status: 400 });
  } catch (error) {
    console.error("Refund route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected refund error",
      },
      { status: 500 }
    );
  }
}