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
  quantity: null;
  title: string;
  customer_name: string | null;
  created_at: string;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
};

type ToPickItem = OnlineToPickItem | BackorderToPickItem;

type ReadyBackorder = {
  id: string;
  title: string;
  customer_name: string | null;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
};

type ToOrderItem = {
  backorder_id: string;
  product_name?: string | null;
  customer_name?: string | null;
  order_intent?: string | null;
  quantity?: number | null;
};

type Props = {
  toPick?: ToPickItem[];
  readyBackorders?: ReadyBackorder[];
  toOrder?: ToOrderItem[];
};

type GroupedOnlineOrder = {
  order_id: string;
  created_at: string;
  customer_name: string | null;
  items: OnlineToPickItem[];
};

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function getStatus(item: ToPickItem) {
  // Backorders: payment status matters
  if (item.source === "backorder") {
    if (item.payment_status === "paid") {
      return {
        text: "Ready for collection · payment taken",
        colour: "green" as const,
      };
    }

    return {
      text: "Ready for collection · payment due",
      colour: "orange" as const,
    };
  }

  // Online orders: payment is already settled upstream,
  // but we DO NOT mutate payment state here
  return {
    text: "Ready for collection",
    colour: "green" as const,
  };
}


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
    if (items.length === 0) return;

    await fetch("/api/admin/operations/mark-picked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    window.location.reload();
  }

  async function markCollected(
    backorderId: string,
    markPaid: boolean,
    paymentReference?: string
  ) {
    await fetch("/api/admin/operations/mark-collected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backorder_id: backorderId,
        markPaid,
        payment_reference: paymentReference,
      }),
    });

    window.location.reload();
  }

  /* ---------------------------------------------
     GROUP ONLINE ITEMS BY ORDER
  --------------------------------------------- */

  const groupedOnline = Object.values(
    toPick
      .filter(
        (i): i is OnlineToPickItem => i.source === "online"
      )
      .reduce<Record<string, GroupedOnlineOrder>>((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = {
            order_id: item.order_id,
            created_at: item.created_at,
            customer_name: item.customer_name,
            items: [],
          };
        }

        acc[item.order_id].items.push(item);
        return acc;
      }, {})
  );

  const backorderItems = toPick.filter(
    (i): i is BackorderToPickItem => i.source === "backorder"
  );

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-14">
      <h1 className="text-3xl font-bold">Operations</h1>

      {/* ===================== 🔴 TO PICK ===================== */}
      <section>
        <h2 className="font-semibold mb-4">🔴 To Pick</h2>

        {groupedOnline.length === 0 && backorderItems.length === 0 && (
          <p className="text-sm text-gray-500">Nothing to pick.</p>
        )}

        {groupedOnline.map((order) => {
          const bulkItems = order.items.map((i) => ({
            source: "online" as const,
            id: i.id,
          }));

          return (
            <div key={order.order_id} className="space-y-3 mb-6">
              {order.items.map((i) => {
                const status = getStatus(i);

                return (
                  <div
                    key={i.id}
                    className="border rounded px-4 py-3 flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">📦 {i.title}</div>

                      <div className="text-sm text-gray-600">
                        {i.customer_name ?? "Unknown customer"}
                      </div>

                      <div
                        className={`text-xs ${
                          status.colour === "green"
                            ? "text-green-700"
                            : "text-orange-700"
                        }`}
                      >
                        {status.text}
                      </div>

                      <div className="text-xs text-gray-400">
                        Qty: {i.quantity} · {formatDate(i.created_at)}
                      </div>

                      <div className="text-xs text-gray-500 flex gap-4 pt-1">
                        <Link
                          href={`/admin/orders/${order.order_id}`}
                          className="underline"
                        >
                          View order
                        </Link>

                        {order.items.length > 1 && (
                          <button
                            onClick={() => markPicked(bulkItems)}
                            className="underline"
                          >
                            Mark entire order picked
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        markPicked([{ source: "online", id: i.id }])
                      }
                      className="text-sm underline text-green-700"
                    >
                      Mark picked
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}

        {backorderItems.map((b) => {
          const status = getStatus(b);

          return (
            <div
              key={b.id}
              className="border rounded px-4 py-3 mb-3 flex justify-between items-start"
            >
              <div className="space-y-1">
                <div className="font-medium">📦 {b.title}</div>
                <div className="text-sm text-gray-600">
                  {b.customer_name ?? "Unknown customer"}
                </div>
                <div
                  className={`text-xs ${
                    status.colour === "green"
                      ? "text-green-700"
                      : "text-orange-700"
                  }`}
                >
                  {status.text}
                </div>
              </div>

              <button
                onClick={() =>
                  markPicked([{ source: "backorder", id: b.id }])
                }
                className="text-sm underline text-green-700"
              >
                Mark picked
              </button>
            </div>
          );
        })}
      </section>

      {/* ===================== 🟢 READY ===================== */}
      <section>
        <h2 className="font-semibold mb-4">🟢 Ready for Collection</h2>

        {readyBackorders.length === 0 && (
          <p className="text-sm text-gray-500">
            No orders ready for collection.
          </p>
        )}

        {readyBackorders.map((b) => {
          const isPaid = b.payment_status === "paid";
          const ref = paymentRefs[b.id] ?? "";

          return (
            <div
              key={b.id}
              className="border rounded px-4 py-3 mb-3 space-y-3"
            >
              <div>
                <div className="font-medium">📦 {b.title}</div>
                <div className="text-sm text-gray-600">
                  {b.customer_name ?? "Unknown customer"}
                </div>
                <div className="text-xs text-green-700">
                  Ready for collection
                </div>
              </div>

              {!isPaid && (
                <input
                  type="text"
                  placeholder="Payment reference"
                  value={ref}
                  onChange={(e) =>
                    setPaymentRefs((p) => ({
                      ...p,
                      [b.id]: e.target.value,
                    }))
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              )}

              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={() => markCollected(b.id, !isPaid, ref)}
                  disabled={!isPaid && !ref}
                  className="text-sm bg-green-700 text-white px-4 py-1.5 rounded disabled:opacity-40"
                >
                  {isPaid ? "Mark collected" : "Complete collection"}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* ===================== 🔵 TO ORDER ===================== */}
      <section>
        <h2 className="font-semibold mb-4">🔵 To Order ({toOrder.length})</h2>

        {toOrder.length === 0 && (
          <p className="text-sm text-gray-500">
            No items awaiting supplier order.
          </p>
        )}

        {toOrder.map((o) => (
          <div key={o.backorder_id} className="border rounded px-4 py-3">
            <div className="font-medium">
              📦 {o.product_name ?? "Unknown product"}
            </div>
            <div className="text-sm text-gray-600">
              {o.customer_name ?? "Unknown customer"}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
