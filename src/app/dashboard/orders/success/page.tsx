"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CartClearOnSuccess from "@/components/CartClearOnSuccess";

/* ==============================
   Types
============================== */

type Order = {
  id: string;
  total: number;
  paid_at: string | null;
  stripe_receipt_url?: string | null;
};

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // raw price number
};

const LOGO_URL =
  "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const params = useParams();

  const sessionId = searchParams.get("session_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ==============================
     Load order from API
  ============================== */
  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/orders/fetch-session?session_id=${sessionId}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setItems(data.order?.items || []);
      }

      setLoading(false);
    }

    load();
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-14">

      {/* 🔥 Clears cart once */}
      <CartClearOnSuccess />

      {/* LOGO */}
      <div className="flex justify-center mb-8">
        <Image
          src={LOGO_URL}
          alt="Pages & Peace"
          height={64}
          width={160}
          className="h-16 w-auto"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <p className="text-center text-neutral-700">Loading your order…</p>
      )}

      {/* No order yet */}
      {!loading && !order && (
        <div className="bg-red-100 text-red-700 p-4 rounded max-w-xl mx-auto">
          Order not found — please refresh.
        </div>
      )}

      {/* Order loaded */}
      {order && (
        <div className="max-w-2xl mx-auto space-y-10">

          <h1 className="text-3xl font-bold tracking-wide text-center">
            🎉 Thank you for your purchase!
          </h1>

          <p className="text-center text-neutral-600">
            Your order has been processed successfully.
          </p>

          {/* ORDER DETAILS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Order Details</h2>

            <p><strong>Order ID:</strong> {order.id}</p>

            <p>
              <strong>Total Paid:</strong> £{order.total.toFixed(2)}
            </p>

            {order.paid_at && (
              <p>
                <strong>Paid At:</strong>{" "}
                {new Date(order.paid_at).toLocaleString("en-GB")}
              </p>
            )}
          </section>

          <hr className="border-neutral-400" />

          {/* ITEMS */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Items</h2>

            {items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between border-b pb-3"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-neutral-500">Qty: {item.quantity}</p>
                </div>

                <p className="font-semibold text-accent">
                  £{(Number(item.price) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </section>

          <hr className="border-neutral-400" />

          {/* RECEIPT */}
          {order.stripe_receipt_url && (
            <p>
              <a
                href={order.stripe_receipt_url}
                target="_blank"
                className="underline text-blue-700"
              >
                View Stripe Receipt
              </a>
            </p>
          )}

          {/* ACTIONS */}
          <section className="text-center space-y-4 pt-4">
            <Link
              href="/dashboard/orders"
              className="underline text-neutral-700 text-sm"
            >
              Return to orders list
            </Link>
          </section>
        </div>
      )}
    </main>
  );
}
