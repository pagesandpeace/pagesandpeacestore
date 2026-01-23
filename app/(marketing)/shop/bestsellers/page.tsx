"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/shop/ProductGrid";

/* ---------------------------------------------
   Product shape (must match ProductCard)
--------------------------------------------- */
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  display_title?: string | null;
  author?: string | null;
}

/* ---------------------------------------------
   Bestseller extension
--------------------------------------------- */
interface BestsellerProduct extends Product {
  bestseller_rank: number;
  import_month: string;
}

/* ---------------------------------------------
   API response shape
--------------------------------------------- */
interface BestsellerResponse {
  items: BestsellerProduct[];
  import_month: string;
  limit: number;
  source: string;
}

export default function BestsellersPage() {
  const [products, setProducts] = useState<BestsellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importMonth, setImportMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 🔑 HARD RESET — prevents old Top 50 sticking around
      setLoading(true);
      setProducts([]);

      const res = await fetch("/api/shop/bestsellers", {
        cache: "no-store", // 🔒 force fresh data
      });

      const data = (await res.json()) as BestsellerResponse;

      if (cancelled) return;

      // 🔒 FINAL DEFENSIVE FILTER
      const rankedOnly = (data.items ?? []).filter(
        (p): p is BestsellerProduct =>
          typeof p.bestseller_rank === "number" &&
          p.bestseller_rank > 0 &&
          p.bestseller_rank <= 50 &&
          p.import_month === data.import_month
      );

      // 🔍 DECISIVE LOG (this is the truth)
      console.log("📊 BESTSELLERS FINAL RENDER", {
        import_month: data.import_month,
        count: rankedOnly.length,
        ranks: rankedOnly.map((p) => p.bestseller_rank),
        products: rankedOnly.map((p) => ({
          id: p.id,
          name: p.name,
          rank: p.bestseller_rank,
        })),
      });

      setProducts(rankedOnly);
      setImportMonth(data.import_month);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold">Bestsellers</h1>

          <p className="text-lg text-neutral-700 max-w-2xl">
            The top 50 books this month, ranked using UK industry data.
          </p>

          {importMonth && (
            <p className="text-sm text-neutral-500">
              Rankings for <strong>{importMonth}</strong>
            </p>
          )}

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
            No bestseller data available for this month.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </main>
  );
}
