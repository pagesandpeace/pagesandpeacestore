"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import NeedRefundHelp from "@/components/NeedRefundHelp";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */
type OrderItem = {
  productName: string | null;
  quantity: number;
  price: number;
};

type StoreOrder = {
  id: string;
  created_at: string | Date;
  total: number;
  status: string;
  items: OrderItem[];

  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_receipt_url?: string | null;
  stripe_card_brand?: string | null;
  stripe_last4?: string | null;
  paid_at?: string | null;

  refunded_amount?: number | null;
  stripe_refund_id?: string | null;
  refund_processed_at?: string | null;
};

/* ---------------------------------------------
   PAGE
--------------------------------------------- */
export default function StoreOrderReceiptPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/orders/get?id=${orderId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load order");
        }

        setOrder(data.order);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to load order";
        setErr(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  /* ---------------------------------------------
     STATES
  --------------------------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-70">Loading order…</p>
      </main>
    );
  }

  if (err || !order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Order not found</h1>
        <p className="opacity-80 mb-6">{err || "Invalid order"}</p>

        <Link href="/dashboard/orders">
          <Button variant="neutral" size="md" className="w-full">
            Back to orders
          </Button>
        </Link>
      </main>
    );
  }

  const refundMessage =
    order.status === "refunded"
      ? "This order has been fully refunded"
      : order.status === "partially_refunded"
      ? "This order has been partially refunded"
      : null;

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#FAF6F1]">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm uppercase tracking-wide opacity-60 mb-1">
          Pages & Peace
        </div>

        <h1 className="text-2xl font-semibold">Order Receipt</h1>

        <p className="mt-3 text-sm">
          Placed on:{" "}
          <strong>{new Date(order.created_at).toLocaleString()}</strong>
        </p>

        <p className="mt-1 text-sm">
          Status: <strong className="capitalize">{order.status}</strong>
        </p>

        {/* REFUND BANNER */}
        {refundMessage && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{refundMessage}</p>
            <p className="mt-1">
              Any refunded amount has been returned to the original payment
              method.
            </p>
          </div>
        )}

        {/* ITEMS */}
        <div className="mt-6 rounded-xl border p-4 bg-white">
          <p className="text-sm font-semibold mb-3">Items</p>

          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center py-2 border-b last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {item.productName || "Unknown Product"}
                </p>
                <p className="text-xs opacity-70">Qty: {item.quantity}</p>
              </div>

              <p className="text-sm font-medium">
                £{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="mt-4 text-right text-lg font-semibold">
          Total paid: £{order.total.toFixed(2)}
        </div>

        {/* PAYMENT DETAILS */}
        <div className="mt-6 rounded-xl border bg-[#FAF6F1] p-4">
          <p className="text-sm font-semibold mb-2">Payment Details</p>

          {order.stripe_card_brand && (
            <p className="text-sm">
              Card: {order.stripe_card_brand.toUpperCase()} ••••{" "}
              {order.stripe_last4}
            </p>
          )}

          {order.stripe_payment_intent_id && (
            <p className="text-sm">
              Payment Intent: {order.stripe_payment_intent_id}
            </p>
          )}

          {order.stripe_receipt_url && (
            <a
              href={order.stripe_receipt_url}
              target="_blank"
              className="text-sm underline text-accent mt-2 inline-block"
            >
              View payment receipt
            </a>
          )}
        </div>

        {/* REFUND DETAILS */}
        {(order.refunded_amount != null || order.refund_processed_at) && (
          <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
            <p className="text-sm font-semibold mb-2">Refund Details</p>

            {order.refunded_amount != null && (
              <p className="text-sm">
                Refunded amount: £{order.refunded_amount.toFixed(2)}
              </p>
            )}

            {order.refund_processed_at && (
              <p className="text-sm">
                Processed on:{" "}
                {new Date(order.refund_processed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* NEED REFUND HELP */}
        {order.status !== "refunded" && (
          <NeedRefundHelp orderId={order.id} />
        )}

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/dashboard/orders">
            <Button variant="neutral" size="md" className="w-full">
              Back to orders
            </Button>
          </Link>

          <Link href="/shop">
            <Button variant="primary" size="md" className="w-full">
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
