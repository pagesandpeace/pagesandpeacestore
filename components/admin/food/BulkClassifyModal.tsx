"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type Product = {
  id: string;
  name: string;
  product_type: string;
};

type Props = {
  rawName: string;
  salesEventIds: string[];
  triggerLabel?: string;
  variant?: "default" | "warning";
};

/* --------------------------------------------------
   HELPERS — SAFE NORMALISATION + SCORING
-------------------------------------------------- */

function normalise(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(raw: string, product: string) {
  const r = normalise(raw);
  const p = normalise(product);

  if (!r || !p) return 0;
  if (p === r) return 100;
  if (p.includes(r)) return 80;
  if (r.includes(p)) return 60;
  return 0;
}

/* --------------------------------------------------
   ALLOWED PRODUCT TYPES
-------------------------------------------------- */

const ALLOWED_PRODUCT_TYPES = ["food", "drink", "book", "merch"];

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function BulkClassifyModal({
  rawName,
  salesEventIds,
  triggerLabel = "Classify",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"product" | "ignore">("product");

  /* --------------------------------------------------
     LOAD CLASSIFIABLE PRODUCTS
  -------------------------------------------------- */

  useEffect(() => {
    if (!open || mode !== "product") return;

    async function loadProducts() {
      const res = await fetch("/api/admin/products?sellable=true");
      const j = await res.json();

      const filtered = (j.products ?? []).filter(
        (p: Product) =>
          ALLOWED_PRODUCT_TYPES.includes(p.product_type)
      );

      setProducts(filtered);
    }

    loadProducts();
  }, [open, mode]);

  /* --------------------------------------------------
     DERIVED: SUGGESTED PRODUCT (NO STATE)
  -------------------------------------------------- */

  const suggestedProductId = useMemo(() => {
    if (!open) return null;
    if (mode !== "product") return null;
    if (!products.length) return null;

    const matches = products
      .map((p) => ({
        product: p,
        score: scoreMatch(rawName, p.name),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return matches.length > 0
      ? matches[0].product.id
      : null;
  }, [open, mode, products, rawName]);

  /* --------------------------------------------------
     SAVE
  -------------------------------------------------- */

  async function handleSave() {
    if (loading) return;

    const finalProductId = productId ?? suggestedProductId;

    if (mode === "product" && !finalProductId) {
      alert("Please select a product or choose Ignore.");
      return;
    }

    setLoading(true);

    await fetch("/api/admin/food/bulk-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "ignore"
          ? {
              salesEventIds,
              ignored: true,
            }
          : {
              salesEventIds,
              product_id: finalProductId,
            }
      ),
    });

    window.location.reload();
  }

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <>
      <button
        className={
          variant === "warning"
            ? "text-xs underline text-amber-700"
            : "text-xs underline"
        }
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>

      {open && (
        <Modal
          title={`Classify "${rawName}"`}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4 text-sm">
            {/* MODE */}
            <div>
              <label className="block mb-1 font-medium">
                Classification type
              </label>
              <select
                className="border rounded w-full px-2 py-1"
                value={mode}
                onChange={(e) => {
                  setMode(
                    e.target.value as "product" | "ignore"
                  );
                  setProductId(null);
                }}
              >
                <option value="product">
                  Map to product (affects stock)
                </option>
                <option value="ignore">
                  Ignore / non-stock sale
                </option>
              </select>
            </div>

            {/* PRODUCT PICKER */}
            {mode === "product" && (
              <div>
                <label className="block mb-1 font-medium">
                  Product
                </label>
                <select
                  className="border rounded w-full px-2 py-1"
                  value={productId ?? suggestedProductId ?? ""}
                  onChange={(e) =>
                    setProductId(e.target.value || null)
                  }
                >
                  <option value="">
                    — Select product —
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div className="text-xs text-muted-foreground mt-1">
                  Suggested automatically when a clear match
                  exists
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-black text-white px-3 py-1 rounded text-xs"
              >
                Save ({salesEventIds.length})
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
