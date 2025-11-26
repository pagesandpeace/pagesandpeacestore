"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useCart } from "@/context/CartContext";

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

type OrderResponse = {
  order: {
    id: string;
    created_at: string;
    total: number;
    status: string;
    items: OrderItem[];
    stripe_receipt_url?: string | null;
    paid_at?: string | null;
  };
};

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderResponse["order"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { clearCart } = useCart();

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setError("Missing session ID.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/orders/fetch-session?session_id=${sessionId}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setError("Could not load order details.");
          setLoading(false);
          return;
        }

        const data: OrderResponse = await res.json();
        setOrder(data.order);

        // Clear cart after successful purchase
        clearCart();
      } catch {
        setError("Something went wrong loading your order.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-20 flex justify-center">
        <p className="text-lg text-[var(--foreground)]">Loading your order…</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-20 max-w-xl mx-auto">
        <Alert type="error" message={error ?? "Order not found."} />

        <Link href="/dashboard/orders">
          <Button variant="outline" className="mt-6 w-full">
            ← Back to Orders
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16 font-[Montserrat]">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-[var(--foreground)] text-center">
          Thank you for your purchase!
        </h1>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Total Paid:</strong> £{order.total.toFixed(2)}</p>

          {order.paid_at && (
            <p>
              <strong>Paid At:</strong>{" "}
              {new Date(order.paid_at).toLocaleString()}
            </p>
          )}

          <h2 className="text-xl font-semibold mt-6">Items</h2>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between border-b pb-3"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-[var(--foreground)]/60">
                    Qty: {item.quantity}
                  </p>
                </div>

                <p className="font-semibold text-[var(--accent)]">
                  £{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {order.stripe_receipt_url && (
            <Link href={order.stripe_receipt_url} target="_blank">
              <Button variant="outline" className="w-full mt-4">
                View Stripe Receipt
              </Button>
            </Link>
          )}
        </div>

        <Link href="/dashboard/orders">
          <Button variant="primary" size="lg" className="w-full">
            View All Orders →
          </Button>
        </Link>
      </div>
    </main>
  );
}
