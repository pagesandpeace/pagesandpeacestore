"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type PaymentStatus = "unpaid" | "deposit_taken" | "paid";

type LineItem = {
  backorder_id: string;
  product_name: string;
  quantity: number;
};

type CustomerGroup = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_status: PaymentStatus;
  items: LineItem[];
};

type SupplierOrderGroup = {
  order_date: string;
  status: "awaiting_order" | "ordered" | "received" | "collected";
  customers: CustomerGroup[];
};

type TabKey = SupplierOrderGroup["status"];

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function SupplierOrdersPage() {
  const [data, setData] = useState<SupplierOrderGroup[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("awaiting_order");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ---------------------------------------------
     DATA LOAD
  --------------------------------------------- */

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/supplier-orders");
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  /* ---------------------------------------------
     BULK ACTIONS
  --------------------------------------------- */

  const submitBulk = async (
    action: "ordered" | "delivered" | "collected"
  ) => {
    if (selected.size === 0) return;

    await fetch("/api/admin/backorders/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        action,
      }),
    });

    setSelected(new Set());
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = data.filter((d) => d.status === activeTab);

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Backorders</h1>

      <Tabs active={activeTab} onChange={setActiveTab} />

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500">No backorders in this state.</p>
      )}

      {filtered.map((group) => (
        <div
          key={`${group.order_date}-${group.status}`}
          className="border rounded-lg bg-white p-5 space-y-4"
        >
          <div className="flex justify-between items-center">
            <p className="font-medium">To be ordered on: {group.order_date}</p>

            {activeTab !== "collected" && (
              <button
                disabled={selected.size === 0}
                onClick={() =>
                  submitBulk(
                    activeTab === "awaiting_order"
                      ? "ordered"
                      : activeTab === "ordered"
                      ? "delivered"
                      : "collected"
                  )
                }
                className="px-4 py-2 text-sm bg-black text-white rounded disabled:opacity-40"
              >
                {activeTab === "awaiting_order" && "Mark selected as ordered"}
                {activeTab === "ordered" && "Mark selected as delivered"}
                {activeTab === "received" && "Mark selected as closed"} (
                {selected.size})
              </button>
            )}
          </div>

          <BackordersTable
            group={group}
            selectable={activeTab !== "collected"}
            selected={selected}
            onToggle={toggleSelect}
            paymentGate={activeTab === "received"}
            onPaymentUpdated={load}
            readOnly={activeTab === "collected"}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------
   TABLE (REUSED EVERYWHERE)
--------------------------------------------- */

function BackordersTable({
  group,
  selectable,
  selected,
  onToggle,
  paymentGate,
  onPaymentUpdated,
  readOnly,
}: {
  group: SupplierOrderGroup;
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  paymentGate?: boolean;
  onPaymentUpdated: () => void;
  readOnly?: boolean;
}) {
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          {selectable && <th className="border p-2"></th>}
          <th className="border p-2 text-left">Product</th>
          <th className="border p-2">Qty</th>
          <th className="border p-2">Customer</th>
          <th className="border p-2">Payment</th>
        </tr>
      </thead>

      <tbody>
        {group.customers.flatMap((c) =>
          c.items.map((item) => {
            const checkboxDisabled =
              !selectable ||
              (paymentGate && c.payment_status !== "paid");

            return (
              <tr
                key={`${group.order_date}-${c.customer_email}-${item.backorder_id}`}
              >
                {selectable && (
                  <td className="border p-2 text-center">
                    <input
                      type="checkbox"
                      disabled={checkboxDisabled}
                      checked={selected.has(item.backorder_id)}
                      onChange={() => onToggle(item.backorder_id)}
                    />
                  </td>
                )}

                <td className="border p-2">{item.product_name}</td>
                <td className="border p-2 text-center">{item.quantity}</td>

                <td className="border p-2">
                  {c.customer_name}
                  <div className="text-xs text-gray-500">
                    {c.customer_email}
                  </div>
                </td>

                <td className="border p-2 text-center">
                  {readOnly ? (
                    <Badge
                      className={
                        c.payment_status === "paid"
                          ? "bg-green-100 text-green-700"
                          : c.payment_status === "deposit_taken"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {c.payment_status.replace("_", " ")}
                    </Badge>
                  ) : (
                    <PaymentSelect
                      value={c.payment_status}
                      backorderId={item.backorder_id}
                      onUpdated={onPaymentUpdated}
                    />
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------
   PAYMENT EDITOR
--------------------------------------------- */

function PaymentSelect({
  value,
  backorderId,
  onUpdated,
}: {
  value: PaymentStatus;
  backorderId: string;
  onUpdated: () => void;
}) {
  return (
    <select
      value={value}
      onChange={async (e) => {
        await fetch("/api/admin/backorders/update-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: backorderId,
            payment_status: e.target.value,
          }),
        });
        onUpdated();
      }}
      className="text-sm border rounded px-2 py-1"
    >
      <option value="unpaid">Unpaid</option>
      <option value="deposit_taken">Deposit taken</option>
      <option value="paid">Paid</option>
    </select>
  );
}

/* ---------------------------------------------
   TABS
--------------------------------------------- */

function Tabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="flex gap-2 border-b pb-2">
      <Tab label="To be ordered" active={active === "awaiting_order"} onClick={() => onChange("awaiting_order")} />
      <Tab label="Awaiting delivery" active={active === "ordered"} onClick={() => onChange("ordered")} />
      <Tab label="Delivered" active={active === "received"} onClick={() => onChange("received")} />
      <Tab label="Closed" active={active === "collected"} onClick={() => onChange("collected")} />
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 transition ${
        active
          ? "border-black font-medium"
          : "border-transparent text-gray-500 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}
