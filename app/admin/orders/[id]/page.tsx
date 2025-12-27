"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  kind: "product" | "event";
  name: string | null;
  quantity: number;
  refunded_quantity: number | null;
  refunded_amount: number | null;
  price: number;
  event_id: string | null;
};

type Order = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  order_items: OrderItem[];
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------
     LOAD ORDER (SERVER CALL VIA API)
  -------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      const { id } = await params;

      try {
        const res = await fetch(`/api/admin/orders/get?id=${id}`, {
          cache: "no-store",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load order");

        setOrder(data.order);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params]);

  /* --------------------------------------------------
     REFUND HELPERS
  -------------------------------------------------- */
  async function refundItem(orderItemId: string) {
    if (!confirm("Refund 1 item?")) return;

    const res = await fetch("/api/admin/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Refund failed");
      return;
    }

    window.location.reload();
  }

  /* --------------------------------------------------
     STATES
  -------------------------------------------------- */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-sm opacity-70">
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-sm opacity-70 mt-2">{error}</p>
      </div>
    );
  }

  /* --------------------------------------------------
     TOTALS
  -------------------------------------------------- */
  const refundedTotal = order.order_items.reduce(
    (sum, item) => sum + Number(item.refunded_amount ?? 0),
    0
  );

  const refundable = Number(order.total) - refundedTotal;

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Order</h1>
        <p className="text-xs font-mono text-neutral-500 mt-1">
          {order.id}
        </p>
      </div>

      {/* META */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Date</p>
          <p>{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-neutral-500">Status</p>
          <p className="capitalize">{order.status}</p>
        </div>
        <div>
          <p className="text-neutral-500">Total</p>
          <p>£{Number(order.total).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-neutral-500">Refunded</p>
          <p>£{refundedTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* ITEMS */}
      <div>
        <h2 className="font-semibold mb-3">Items</h2>

        <div className="space-y-3">
          {order.order_items.map((item) => {
            const refundedQty = item.refunded_quantity ?? 0;
            const remainingQty = item.quantity - refundedQty;

            const displayName =
              item.name ??
              (item.kind === "event" ? "Event ticket" : "Product");

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{displayName}</p>

                  <p className="text-xs text-neutral-500 capitalize">
                    {item.kind} · Purchased {item.quantity}
                  </p>

                  <p className="text-xs text-neutral-500">
                    Refunded {refundedQty} · Remaining {remainingQty}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="text-right space-y-2">
                  <p>£{Number(item.price).toFixed(2)}</p>

                  {/* PRODUCT → REFUND 1 */}
                  {item.kind === "product" && remainingQty > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refundItem(item.id)}
                    >
                      Refund 1
                    </Button>
                  )}

                  {/* EVENT → MANAGE SEATS */}
                  {item.kind === "event" && item.event_id && (
                    <Link href={`/admin/events/${item.event_id}`}>
                      <Button size="sm" variant="outline">
                        Manage attendees
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL ORDER REFUND */}
      {refundable > 0 && (
        <div className="pt-4 border-t">
          <RefundOrderButton
            orderId={order.id}
            refundable={refundable}
          />
        </div>
      )}
    </div>
  );
}
