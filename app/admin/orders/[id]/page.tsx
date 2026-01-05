"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

/* --------------------------------------------------
   Types
-------------------------------------------------- */

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

type ReconcilePlanItem = {
  ticketTypeId: string;
  action: "create_bookings" | "create_item_and_bookings";
  seatsCount: number;
};

type ReconcileResult = {
  ok: boolean;
  dryRun: boolean;
  reconciled: boolean;
  expectedSeats: number;
  existingBookings: number;
  plan: ReconcilePlanItem[];
};

/* --------------------------------------------------
   Page
-------------------------------------------------- */

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reconcileRequested = searchParams.get("reconcile") === "1";

  const [order, setOrder] = useState<Order | null>(null);
  const [preview, setPreview] = useState<ReconcileResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------
     LOAD ORDER
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
     DRY-RUN RECONCILE (PREVIEW)
  -------------------------------------------------- */
  useEffect(() => {
    if (!reconcileRequested || !order) return;

    const runDry = async () => {
      const res = await fetch("/api/admin/orders/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          dryRun: true,
        }),
      });

      const json = await res.json();
      if (res.ok) setPreview(json);
    };

    runDry();
  }, [reconcileRequested, order]);

  async function confirmReconcile() {
  if (!order) return;
  if (!confirm("This will restore missing event bookings. Continue?")) return;

  setReconciling(true);

  await fetch("/api/admin/orders/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.id,
      dryRun: false,
    }),
  });

  // 🔑 Re-run dry-run to get new state
  const res = await fetch("/api/admin/orders/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.id,
      dryRun: true,
    }),
  });

  const json = await res.json();
  setPreview(json);

  setReconciling(false);

  // Clean URL
  router.replace(`/admin/orders/${order.id}`);
}


  /* --------------------------------------------------
     REFUND SINGLE ITEM
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

    router.refresh();
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

  const refundedTotal = order.order_items.reduce(
    (sum, item) => sum + Number(item.refunded_amount ?? 0),
    0
  );

  const refundable = Number(order.total) - refundedTotal;

  const isReconciled = preview?.reconciled === true;

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Order</h1>
        <p className="text-xs font-mono text-neutral-500 mt-1">{order.id}</p>
      </div>

      {/* RECONCILIATION STATUS */}
      {preview && !isReconciled && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-4">
          <h2 className="font-semibold text-green-900 mb-2">
            Reconciliation required
          </h2>

          <p className="text-sm text-green-800 mb-3">
            Stripe confirms payment for{" "}
            <strong>{preview.expectedSeats}</strong> event seats, but only{" "}
            <strong>{preview.existingBookings}</strong> have been created.
          </p>

          <ul className="text-sm text-green-900 space-y-1">
            {preview.plan.map((p, i) => (
              <li key={i}>
                • Create <strong>{p.seatsCount}</strong>{" "}
                {p.seatsCount === 1 ? "attendee" : "attendees"} for ticket{" "}
                <span className="font-mono">{p.ticketTypeId.slice(0, 6)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Button onClick={confirmReconcile} disabled={reconciling}>
              {reconciling ? "Reconciling…" : "Confirm reconciliation"}
            </Button>
          </div>
        </div>
      )}

      {preview && isReconciled && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-4">
          <h2 className="font-semibold text-green-900">
            Order fully reconciled ✓
          </h2>
          <p className="text-sm text-green-800">
            All {preview.expectedSeats} event seats have been created successfully.
          </p>
        </div>
      )}

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
          <p>£{order.total.toFixed(2)}</p>
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

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {item.kind} · Purchased {item.quantity}
                  </p>
                </div>

                <div className="text-right space-y-2">
                  <p>£{item.price.toFixed(2)}</p>

                  {item.kind === "event" && item.event_id && (
                    <Link href={`/admin/events/${item.event_id}`}>
                      <Button size="sm" variant="outline">
                        Manage attendees
                      </Button>
                    </Link>
                  )}

                  {item.kind === "product" && remainingQty > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refundItem(item.id)}
                    >
                      Refund 1
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL REFUND */}
      {refundable > 0 && (
        <div className="pt-4 border-t">
          <RefundOrderButton orderId={order.id} refundable={refundable} />
        </div>
      )}
    </div>
  );
}
