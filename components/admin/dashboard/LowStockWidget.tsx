"use client";

import Link from "next/link";
import Image from "next/image";

export default function LowStockWidget({
  items,
}: {
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
        <h2 className="text-xl font-semibold mb-3">
          Critical Stock Overview
        </h2>
        <p className="text-neutral-500">
          No products are currently at critical stock levels.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-semibold">
        Critical Stock Overview
      </h2>

      <p className="text-neutral-600">
        {items.length} products require immediate attention.
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {items.map((p) => (
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

                <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-red-100 border border-red-300 text-red-700">
                  Critical
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
        ))}
      </div>
    </div>
  );
}
