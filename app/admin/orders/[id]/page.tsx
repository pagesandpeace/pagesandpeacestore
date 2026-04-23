"use client";

import { useEffect, useMemo, useState } from "react";
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

type RefundReason =
  | "customer_requested_cancellation"
  | "duplicate_booking"
  | "admin_error"
  | "event_cancelled"
  | "goodwill"
  | "other";

/* --------------------------------------------------
   Constants
-------------------------------------------------- */

const REFUND_REASON_OPTIONS: { value: RefundReason; label: string }[] = [
  {
    value: "customer_requested_cancellation",
    label: "Customer requested cancellation",
  },
  { value: "duplicate_booking", label: "Duplicate booking" },
  { value: "admin_error", label: "Admin error" },
  { value: "event_cancelled", label: "Event cancelled" },
  { value: "goodwill", label: "Goodwill" },
  { value: "other", label: "Other" },
];

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

  const [selectedRefundItem, setSelectedRefundItem] = useState<OrderItem | null>(
    null
  );
  const [refundReason, setRefundReason] =
    useState<RefundReason>("customer_requested_cancellation");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

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

  /* --------------------------------------------------
     HELPERS
  -------------------------------------------------- */
  function openRefundModal(item: OrderItem) {
    setSelectedRefundItem(item);
    setRefundReason("customer_requested_cancellation");
    setRefundNotes("");
    setRefundError(null);
  }

  function closeRefundModal() {
    if (refundSubmitting) return;
    setSelectedRefundItem(null);
    setRefundReason("customer_requested_cancellation");
    setRefundNotes("");
    setRefundError(null);
  }

  function closeReconcileModal() {
    if (reconciling) return;
    setShowReconcileModal(false);
    setReconcileError(null);
  }

  const refundedTotal = useMemo(() => {
    if (!order) return 0;
    return order.order_items.reduce(
      (sum, item) => sum + Number(item.refunded_amount ?? 0),
      0
    );
  }, [order]);

  const refundable = order ? Number(order.total) - refundedTotal : 0;
  const isReconciled = preview?.reconciled === true;

  /* --------------------------------------------------
     RECONCILE ACTION
  -------------------------------------------------- */
  async function confirmReconcile() {
    if (!order) return;

    setReconciling(true);
    setReconcileError(null);

    try {
      const runRes = await fetch("/api/admin/orders/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          dryRun: false,
        }),
      });

      const runJson = await runRes.json().catch(() => null);

      if (!runRes.ok) {
        throw new Error(runJson?.error || "Reconciliation failed");
      }

      const previewRes = await fetch("/api/admin/orders/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          dryRun: true,
        }),
      });

      const previewJson = await previewRes.json().catch(() => null);

      if (!previewRes.ok) {
        throw new Error(previewJson?.error || "Failed to refresh reconciliation");
      }

      setPreview(previewJson);
      setShowReconcileModal(false);
      router.replace(`/admin/orders/${order.id}`);
      router.refresh();
    } catch (e) {
      setReconcileError(
        e instanceof Error ? e.message : "Reconciliation failed"
      );
    } finally {
      setReconciling(false);
    }
  }

  /* --------------------------------------------------
     REFUND SINGLE PRODUCT ITEM
  -------------------------------------------------- */
  async function confirmRefundItem() {
    if (!selectedRefundItem) return;

    setRefundSubmitting(true);
    setRefundError(null);

    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: selectedRefundItem.id,
          reason: refundReason,
          notes: refundNotes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Refund failed");
      }

      closeRefundModal();
      router.refresh();
    } catch (e) {
      setRefundError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundSubmitting(false);
    }
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
              <li key={`${p.ticketTypeId}-${i}`}>
                • Create <strong>{p.seatsCount}</strong>{" "}
                {p.seatsCount === 1 ? "attendee" : "attendees"} for ticket{" "}
                <span className="font-mono">{p.ticketTypeId.slice(0, 6)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Button onClick={() => setShowReconcileModal(true)}>
              Confirm reconciliation
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
            const itemTotal = item.quantity * Number(item.price);
            const itemRefunded = Number(item.refunded_amount ?? 0);

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex flex-col gap-4 md:flex-row md:justify-between md:items-start"
              >
                <div className="space-y-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {item.kind} · Purchased {item.quantity}
                  </p>
                  <div className="text-xs text-neutral-600 space-y-1">
                    <p>Line total: £{itemTotal.toFixed(2)}</p>
                    <p>Refunded: £{itemRefunded.toFixed(2)}</p>
                    {item.kind === "product" && (
                      <p>
                        Remaining refundable quantity:{" "}
                        <strong>{remainingQty}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left md:text-right space-y-2">
                  <p>£{item.price.toFixed(2)} each</p>

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
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => openRefundModal(item)}
                    >
                      Refund 1 item
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

      {/* REFUND ITEM MODAL */}
      {selectedRefundItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-red-700">
                Confirm product refund
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                This will send a real refund through Stripe.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-neutral-500">Item</p>
                    <p className="font-medium">
                      {selectedRefundItem.name || "Product item"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Refund amount</p>
                    <p className="font-medium">
                      £{Number(selectedRefundItem.price).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Purchased quantity</p>
                    <p className="font-medium">{selectedRefundItem.quantity}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Already refunded</p>
                    <p className="font-medium">
                      {selectedRefundItem.refunded_quantity ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="refund-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Refund reason
                </label>
                <select
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) =>
                    setRefundReason(e.target.value as RefundReason)
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                  {REFUND_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="refund-notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="refund-notes"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Add any internal notes for the refund log"
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              {refundError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {refundError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={closeRefundModal}
                disabled={refundSubmitting}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmRefundItem}
                disabled={refundSubmitting}
              >
                {refundSubmitting
                  ? "Processing..."
                  : `Confirm refund of £${Number(selectedRefundItem.price).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILE MODAL */}
      {showReconcileModal && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-green-700">
                Confirm reconciliation
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                This will restore the missing event bookings for this paid order.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-neutral-500">Expected seats</p>
                    <p className="font-medium">{preview.expectedSeats}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Existing bookings</p>
                    <p className="font-medium">{preview.existingBookings}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Actions to perform</p>
                <ul className="space-y-2 text-sm text-neutral-700">
                  {preview.plan.map((p, i) => (
                    <li
                      key={`${p.ticketTypeId}-${i}`}
                      className="rounded-md border bg-neutral-50 px-3 py-2"
                    >
                      Create <strong>{p.seatsCount}</strong>{" "}
                      {p.seatsCount === 1 ? "attendee" : "attendees"} for ticket{" "}
                      <span className="font-mono">{p.ticketTypeId.slice(0, 6)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {reconcileError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {reconcileError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={closeReconcileModal}
                disabled={reconciling}
              >
                Cancel
              </Button>

              <Button onClick={confirmReconcile} disabled={reconciling}>
                {reconciling ? "Reconciling..." : "Confirm reconciliation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}