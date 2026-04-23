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
  id: string;
  kind?: string | null; // ✅ ADDED
  productName: string | null;
  quantity: number;
  price: number;
  refunded_quantity?: number | null;
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

  refunded_amount?: number | null;
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

  const FOOD_FORM_URL = "https://tally.so/r/Med4gl";

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

  /* ---------------------------------------------
     🔥 EVENT DETECTION (KEY)
  --------------------------------------------- */
  const hasEvent = order.items.some(
    (item) => item.kind === "event"
  );

  const refundMessage =
    order.status === "refunded"
      ? "This order has been fully refunded"
      : order.status === "partially_refunded"
      ? "This order has been partially refunded"
      : null;

  const refundedTotal = order.items.reduce((sum, item) => {
    const refundedQty = item.refunded_quantity ?? 0;
    return sum + refundedQty * item.price;
  }, 0);

  const netPaid = order.total - refundedTotal;

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
              Refunded items are returned to your original payment method.
            </p>
          </div>
        )}

        {/* ITEMS */}
        <div className="mt-6 rounded-xl border p-4 bg-white">
          <p className="text-sm font-semibold mb-3">Items</p>

          {order.items.map((item, idx) => {
            const refundedQty = item.refunded_quantity ?? 0;
            const purchasedQty = item.quantity;
            const netQty = purchasedQty - refundedQty;

            const lineTotal = item.price * purchasedQty;
            const refundedValue = refundedQty * item.price;

            return (
              <div
                key={idx}
                className="py-3 border-b last:border-b-0 space-y-1"
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-medium leading-snug">
                    {item.productName || "Item"}{" "}
                    <span className="opacity-70">× {purchasedQty}</span>
                  </p>

                  <p className="text-sm font-medium whitespace-nowrap">
                    £{lineTotal.toFixed(2)}
                  </p>
                </div>

                {refundedQty > 0 && (
                  <div className="text-xs text-red-600 space-y-0.5">
                    <p>
                      Refunded: {refundedQty} × £{item.price.toFixed(2)} = −£
                      {refundedValue.toFixed(2)}
                    </p>
                    <p>
                      Remaining: {netQty} × £{item.price.toFixed(2)} = £
                      {(netQty * item.price).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* TOTALS */}
        <div className="mt-4 space-y-1 text-sm">
          <p>Total paid: £{order.total.toFixed(2)}</p>

          {refundedTotal > 0 && (
            <>
              <p className="text-red-600">
                Refunded: −£{refundedTotal.toFixed(2)}
              </p>
              <p className="font-semibold">
                Net paid: £{netPaid.toFixed(2)}
              </p>
            </>
          )}
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

        {/* NEED HELP */}
        {order.status !== "refunded" && (
          <NeedRefundHelp orderId={order.id} />
        )}

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col gap-3">

          {/* 🍽️ PRE-ORDER FOOD (ONLY FOR EVENTS) */}
          {hasEvent && (
            <a
              href={FOOD_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="md" className="w-full">
                Pre-order food for your event →
              </Button>
            </a>
          )}

          {/* BACK TO ORDERS */}
          <Link href="/dashboard/orders">
            <Button variant="neutral" size="md" className="w-full">
              Back to orders
            </Button>
          </Link>

        </div>
      </div>
    </main>
  );
}