"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/shop/ProductGrid";

export default function BestsellersPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/shop/bestsellers");
      const data = await res.json();
      setProducts(data.items ?? []);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold">Bestsellers</h1>
          <p className="text-lg text-neutral-700 max-w-2xl">
            The top 50 books this month, ranked using UK industry data.
          </p>

          <Link
            href="/shop"
            className="inline-block text-sm underline text-neutral-600 hover:text-black"
          >
            ← Back to shop
          </Link>
        </header>

        {loading ? (
          <p className="text-neutral-600">Loading bestsellers…</p>
        ) : products.length === 0 ? (
          <p className="text-neutral-600">
            No bestseller data available at the moment.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </main>
  );
}
