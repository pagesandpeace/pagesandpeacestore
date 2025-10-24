"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  date: string;
  total: string;
  status: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🧩 Placeholder: simulate fetching from API
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Simulated demo data — replace with real endpoint later
        const mockData: Order[] = [
          {
            id: "ORD-1001",
            date: "2025-10-21",
            total: "£34.50",
            status: "Delivered",
          },
          {
            id: "ORD-1002",
            date: "2025-10-22",
            total: "£19.90",
            status: "Processing",
          },
        ];
        setTimeout(() => {
          setOrders(mockData);
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error("❌ Failed to fetch orders:", err);
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-[#dcd6cf] pb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-widest">My Orders 📦</h1>
          <p className="text-[#111]/70 text-sm">
            Track your recent purchases and order history
          </p>
        </header>

        {/* Orders Table */}
        {loading ? (
          <p className="text-center text-[#777]">Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#111]/70 text-lg mb-4">
              You haven’t placed any orders yet.
            </p>
            <a
              href="/(marketing)/shop"
              className="text-[#5DA865] font-medium hover:underline"
            >
              Visit the shop →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-[#e0dcd6]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FAF6F1] text-[#111]/80 text-sm uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-4 border-b border-[#e0dcd6]">Order ID</th>
                  <th className="px-6 py-4 border-b border-[#e0dcd6]">Date</th>
                  <th className="px-6 py-4 border-b border-[#e0dcd6]">Total</th>
                  <th className="px-6 py-4 border-b border-[#e0dcd6]">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#FAF6F1]/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">{order.id}</td>
                    <td className="px-6 py-4">{order.date}</td>
                    <td className="px-6 py-4">{order.total}</td>
                    <td
                      className={`px-6 py-4 font-medium ${
                        order.status === "Delivered"
                          ? "text-[#5DA865]"
                          : order.status === "Processing"
                          ? "text-[#d89a00]"
                          : "text-[#777]"
                      }`}
                    >
                      {order.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
