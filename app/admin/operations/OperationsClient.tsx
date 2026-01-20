"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type OnlineToPickItem = {
  source: "online";
  id: string;
  order_id: string;
  quantity: number;
  title: string;
  customer_name: string | null;
  created_at: string;
  payment_status: "paid";
};

type BackorderToPickItem = {
  source: "backorder";
  id: string;
  quantity: number;
  title: string;
  customer_name: string | null;
  created_at: string;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
};

type ToPickItem = OnlineToPickItem | BackorderToPickItem;

type ReadyItem = {
  id: string;
  source: "online" | "backorder";
  title: string;
  customer_name: string | null;
  quantity: number;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
};

type ToOrderItem = {
  backorder_id: string;
  product_name: string | null;
  customer_name: string | null;
  quantity: number | null;
  supplier_name: string | null;
  source?: string | null;
};

type Props = {
  toPick: ToPickItem[];
  readyBackorders: ReadyItem[];
  toOrder: ToOrderItem[];
};

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function OperationsClient({
  toPick,
  readyBackorders,
  toOrder,
}: Props) {
  /* ---------------- PAYMENT MODAL STATE ---------------- */

  const [paymentModal, setPaymentModal] = useState<{
    backorderId: string;
    status: "paid" | "unpaid";
    reference: string;
  } | null>(null);

  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ---------------- ACTIONS ---------------- */

  async function markPicked(
    items: { source: "online" | "backorder"; id: string }[]
  ) {
    await fetch("/api/admin/operations/mark-picked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    window.location.reload();
  }

  async function savePayment() {
    if (!paymentModal) return;

    if (
      paymentModal.status === "paid" &&
      !paymentModal.reference.trim()
    ) {
      setPaymentError("Payment reference is required");
      return;
    }

    setSavingPayment(true);
    setPaymentError(null);

    
  await fetch("/api/admin/supplier-orders/set-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    backorder_id: paymentModal.backorderId,
    payment_status: paymentModal.status,
    payment_reference:
      paymentModal.status === "paid"
        ? paymentModal.reference.trim()
        : null,
  }),
});


    setSavingPayment(false);
    setPaymentModal(null);

    window.location.reload();
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="px-8 py-10 space-y-16">
      <h1 className="text-3xl font-semibold">Operations</h1>

      {/* ===================== 🔴 TO PICK ===================== */}

      <section className="space-y-4">
  <h2 className="text-sm font-semibold flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-red-500" />
    📓 To Pick
  </h2>

  <div className="rounded-xl border border-muted overflow-hidden">
    {toPick.length === 0 ? (
      <p className="p-6 text-sm text-foreground/60">
        Nothing to pick.
      </p>
    ) : (
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-foreground/60 border-b border-muted">
          <tr>
            <th className="px-6 py-4 text-left">Item</th>
            <th className="px-6 py-4 text-left">Customer</th>
            <th className="px-6 py-4 text-left">Qty</th>
            <th className="px-6 py-4 text-left">Payment</th>
            <th className="px-6 py-4 text-left">Created</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-muted">
          {toPick.map((i) => (
            <tr
              key={`${i.source}:${i.id}`}
              className="hover:bg-muted/30"
            >
              <td className="px-6 py-5 font-medium">
                {i.title}
              </td>

              <td className="px-6 py-5">
                {i.customer_name ?? "Unknown customer"}
              </td>

              <td className="px-6 py-5">
                {i.quantity}
              </td>

              {/* PAYMENT — informational only */}
              <td className="px-6 py-5">
                {i.source === "online" ? (
                  <span className="text-accent font-medium">
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-foreground/5 text-foreground/60">
                    Pay on collection
                  </span>
                )}
              </td>

              <td className="px-6 py-5">
                {formatDate(i.created_at)}
              </td>

              <td className="px-6 py-5 text-right">
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() =>
                      markPicked([
                        {
                          source: i.source,
                          id: i.id,
                        },
                      ])
                    }
                    className="text-accent hover:underline"
                  >
                    Mark picked
                  </button>

                  {i.source === "online" && (
                    <Link
                      href={`/admin/orders/${i.order_id}`}
                      className="text-xs text-foreground/60 hover:underline"
                    >
                      View order
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</section>

{/* ===================== 🟢 READY FOR COLLECTION ===================== */}

<section className="space-y-4">
  <h2 className="text-sm font-semibold flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-green-500" />
    📦 Ready for Collection
  </h2>

  <div className="rounded-xl border border-muted overflow-hidden">
    {readyBackorders.length === 0 ? (
      <p className="p-6 text-sm text-foreground/60">
        No orders ready for collection.
      </p>
    ) : (
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-foreground/60 border-b border-muted">
          <tr>
            <th className="px-6 py-4 text-left">Item</th>
            <th className="px-6 py-4 text-left">Customer</th>
            <th className="px-6 py-4 text-left">Qty</th>
            <th className="px-6 py-4 text-left">Payment</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-muted">
          {readyBackorders.map((b) => {
            const isPaid =
              b.source === "online" || b.payment_status === "paid";

            return (
              <tr
                key={`${b.source}:${b.id}`}
                className="hover:bg-muted/30"
              >
                <td className="px-6 py-5 font-medium">
                  {b.title}
                </td>

                <td className="px-6 py-5">
                  {b.customer_name ?? "Unknown customer"}
                </td>

                <td className="px-6 py-5">
                  {b.quantity}
                </td>

                {/* PAYMENT — interactive here */}
                <td className="px-6 py-5">
                  {isPaid ? (
                    <span className="text-accent font-medium">
                      Paid
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setPaymentModal({
                          backorderId: b.id,
                          status: "unpaid",
                          reference: "",
                        })
                      }
                    >
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:opacity-80">
                        Pay on collection
                      </span>
                    </button>
                  )}
                </td>

                <td className="px-6 py-5 text-right">
                  <button
                    onClick={() => {
                      if (!isPaid) return;

                      fetch(
                        "/api/admin/operations/mark-collected",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            id: b.id,
                            source: b.source,
                            markPaid: false,
                          }),
                        }
                      ).then(() =>
                        window.location.reload()
                      );
                    }}
                    disabled={!isPaid}
                    className={`hover:underline ${
                      !isPaid
                        ? "text-foreground/40 cursor-not-allowed"
                        : "text-accent"
                    }`}
                  >
                    Complete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
</section>


      {/* ===================== 🔵 TO ORDER ===================== */}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          ➡️ To Order ({toOrder.length})
        </h2>

        <div className="rounded-xl border border-muted overflow-hidden">
          {toOrder.length === 0 ? (
            <p className="p-6 text-sm text-foreground/60">
              No items awaiting supplier order.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-foreground/60 border-b border-muted">
                <tr>
                  <th className="px-6 py-4 text-left">Product</th>
                  <th className="px-6 py-4 text-left">
                    Customer / Source
                  </th>
                  <th className="px-6 py-4 text-left">Qty</th>
                  <th className="px-6 py-4 text-left">
                    Supplier
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-muted">
                {toOrder.map((o) => (
                  <tr
                    key={o.backorder_id}
                    className="hover:bg-muted/30"
                  >
                    <td className="px-6 py-5 font-medium">
                      {o.product_name}
                    </td>
                    <td className="px-6 py-5">
                      {o.source === "customer"
                        ? o.customer_name ??
                          "Unknown customer"
                        : "Stock order"}
                    </td>
                    <td className="px-6 py-5">
                      {o.quantity}
                    </td>
                    <td className="px-6 py-5">
                      {o.supplier_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ===================== PAYMENT MODAL ===================== */}

      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-sm p-4 space-y-4">
            <h3 className="text-lg font-semibold">
              Update payment
            </h3>

            <div className="flex gap-2">
              <Button
                variant={
                  paymentModal.status === "unpaid"
                    ? "primary"
                    : "neutral"
                }
                onClick={() =>
                  setPaymentModal((m) =>
                    m ? { ...m, status: "unpaid" } : m
                  )
                }
              >
                Unpaid
              </Button>

              <Button
                variant={
                  paymentModal.status === "paid"
                    ? "primary"
                    : "neutral"
                }
                onClick={() =>
                  setPaymentModal((m) =>
                    m ? { ...m, status: "paid" } : m
                  )
                }
              >
                Paid
              </Button>
            </div>

            {paymentModal.status === "paid" && (
              <Input
                placeholder="Payment reference"
                value={paymentModal.reference}
                onChange={(e) =>
                  setPaymentModal((m) =>
                    m
                      ? {
                          ...m,
                          reference: e.target.value,
                        }
                      : m
                  )
                }
              />
            )}

            {paymentError && (
              <div className="text-sm text-red-600">
                {paymentError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="neutral"
                onClick={() => setPaymentModal(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={savePayment}
                disabled={savingPayment}
              >
                {savingPayment ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
