"use client";

import { useState } from "react";
import Link from "next/link";

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
};

type BackorderToPickItem = {
  source: "backorder";
  id: string;
  quantity: number;
  title: string;
  customer_name: string | null;
  created_at: string;
  payment_status?: "paid" | "unpaid";
};

type ToPickItem = OnlineToPickItem | BackorderToPickItem;

type ReadyBackorder = {
  id: string;
  source: "backorder" | "online";
  title: string;
  customer_name: string | null;
  quantity: number;
  payment_status?: "paid" | "unpaid";
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
  toPick?: ToPickItem[];
  readyBackorders?: ReadyBackorder[];
  toOrder?: ToOrderItem[];
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
  toPick = [],
  readyBackorders = [],
  toOrder = [],
}: Props) {
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});

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

  async function markCollected(
    id: string,
    markPaid: boolean,
    paymentReference?: string
  ) {
    await fetch("/api/admin/operations/mark-collected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backorder_id: id,
        markPaid,
        payment_reference: paymentReference,
      }),
    });

    window.location.reload();
  }

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
                  <th className="px-6 py-4 text-left">Created</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-muted">
                {toPick.map((i) => (
                  <tr key={`${i.source}:${i.id}`} className="hover:bg-muted/30">
                    <td className="px-6 py-5 font-medium">{i.title}</td>
                    <td className="px-6 py-5">
                      {i.customer_name ?? "Unknown customer"}
                    </td>
                    <td className="px-6 py-5">{i.quantity}</td>
                    <td className="px-6 py-5">
                      {formatDate(i.created_at)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() =>
                            markPicked([{ source: i.source, id: i.id }])
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
                  const isPaid = b.payment_status === "paid";
                  const ref = paymentRefs[b.id] ?? "";

                  return (
                    <tr
                      key={`${b.source}:${b.id}`}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-6 py-5 font-medium">{b.title}</td>
                      <td className="px-6 py-5">
                        {b.customer_name ?? "Unknown customer"}
                      </td>
                      <td className="px-6 py-5">{b.quantity}</td>
                      <td className="px-6 py-5">
                        {isPaid ? (
                          <span className="text-accent font-medium">Paid</span>
                        ) : (
                          <input
                            value={ref}
                            onChange={(e) =>
                              setPaymentRefs((p) => ({
                                ...p,
                                [b.id]: e.target.value,
                              }))
                            }
                            placeholder="Payment reference"
                            className="w-full max-w-xs border border-muted rounded-md px-3 py-2 text-sm bg-background"
                          />
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          disabled={!isPaid && !ref}
                          onClick={() => {
                            if (b.source === "online") {
                              markCollected(b.id, false);
                            } else {
                              markCollected(b.id, !isPaid, ref);
                            }
                          }}
                          className="text-accent hover:underline disabled:opacity-40"
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
                  <th className="px-6 py-4 text-left">Customer / Source</th>
                  <th className="px-6 py-4 text-left">Qty</th>
                  <th className="px-6 py-4 text-left">Supplier</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-muted">
                {toOrder.map((o) => (
                  <tr key={o.backorder_id} className="hover:bg-muted/30">
                    <td className="px-6 py-5 font-medium">
                      {o.product_name}
                    </td>
                    <td className="px-6 py-5">
                      {o.source === "customer"
                        ? o.customer_name ?? "Unknown customer"
                        : "Stock order"}
                    </td>
                    <td className="px-6 py-5">{o.quantity}</td>
                    <td className="px-6 py-5">{o.supplier_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
