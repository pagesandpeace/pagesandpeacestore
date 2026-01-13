"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type ProductResult = {
  id: string;
  name: string;
  product_type: string;
  supplier: string | null;
  inventory_count: number;
};

type Props = {
  onAdd: (product: ProductResult) => void;
};

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function ProductSearchSelect({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* ---------------------------------------------
     AUTO-CLOSE WHEN INPUT CLEARED
  --------------------------------------------- */
  useEffect(() => {
    if (query.trim() === "") {
      setOpen(false);
      setResults([]);
    }
  }, [query]);

  /* ---------------------------------------------
     SEARCH
  --------------------------------------------- */
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/admin/backorders/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!res.ok) return;

        const data: ProductResult[] = await res.json();
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("❌ Product search failed", err);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open]);

  /* ---------------------------------------------
     ADD
  --------------------------------------------- */
  function handleAdd(product: ProductResult) {
    onAdd(product);

    // reset search UI
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
  return (
    <div className="relative">
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Search books or stock…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
      />

      {open && query.trim().length > 0 && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Searching…
            </div>
          )}

          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {p.product_type}
                  {p.supplier ? ` · ${p.supplier}` : ""}
                  {` · stock ${p.inventory_count}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAdd(p)}
                className="px-3 py-1 text-sm bg-black text-white rounded"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
