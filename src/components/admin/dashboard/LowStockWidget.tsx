"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function LowStockWidget({ items }: {
  items: {
    id: string;
    name: string;
    product_type: string;
    inventory_count: number;
    image_url: string | null;
    slug: string;
  }[];
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-3">Low Stock Overview</h2>
        <p className="text-neutral-500">All products have healthy stock.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-semibold">Low Stock Overview</h2>
      <p className="text-neutral-600">
        {items.length} products are below the stock threshold.
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {items.map((p) => {
          const level =
            p.inventory_count <= 2
              ? "critical"
              : "low";

          const badgeClasses =
            level === "critical"
              ? "bg-red-100 border border-red-300 text-red-700"
              : "bg-amber-100 border border-amber-300 text-amber-700";

          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    width={50}
                    height={50}
                    alt={p.name}
                    className="rounded"
                  />
                ) : (
                  <div className="w-[50px] h-[50px] bg-gray-200 rounded" />
                )}

                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    {p.product_type} • Stock: {p.inventory_count}
                  </p>

                  <span className={`text-xs px-2 py-1 rounded ${badgeClasses}`}>
                    {level === "critical" ? "Critical" : "Low"}
                  </span>
                </div>
              </div>

              <Link
                href={`/admin/products/${p.id}/edit`}
                className="text-accent underline text-sm"
              >
                Edit
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
