"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Order = {
  id: string;
  supplier: string;
  quantity: number;
  unit_cost: number | null;
  status: "requested" | "ordered" | "received" | "reconciled" | "cancelled";
  requested_at: string;
  ordered_at: string | null;
  received_at: string | null;
  product: {
    name: string;
    display_title: string | null;
  };
};

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------------------------------
     LOAD ORDERS
  ---------------------------------------------------- */
  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/suppliers/orders", {
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Failed to load supplier orders");
        setOrders([]);
        return;
      }

      if (Array.isArray(json)) {
        setOrders(json);
      } else {
        console.error("Unexpected API response:", json);
        setOrders([]);
        setError("Unexpected response from server");
      }
    } catch (err) {
      console.error("Supplier orders load failed:", err);
      setError("Network error loading supplier orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------
     ACTIONS
  ---------------------------------------------------- */
  async function markOrdered(id: string) {
    await fetch("/api/admin/suppliers/orders/mark-ordered", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });

    load();
  }

  async function markReceived(id: string) {
    await fetch("/api/admin/suppliers/orders/mark-received", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });

    load();
  }

  useEffect(() => {
    load();
  }, []);

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading supplier orders…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Supplier Orders</h1>

      {error && (
        <div className="border border-red-300 bg-red-50 p-3 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">
          No supplier orders found.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <p className="font-medium">
                  {o.product.display_title ?? o.product.name}
                </p>

                <p className="text-sm text-gray-600">
                  {o.supplier} · Qty {o.quantity} ·{" "}
                  <span className="font-medium capitalize">
                    {o.status}
                  </span>
                </p>

                {o.unit_cost !== null && (
                  <p className="text-xs text-gray-500">
                    Unit cost: £{Number(o.unit_cost).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {o.status === "requested" && (
                  <Button onClick={() => markOrdered(o.id)}>
                    Mark ordered
                  </Button>
                )}

                {o.status === "ordered" && (
                  <Button onClick={() => markReceived(o.id)}>
                    Mark received
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
