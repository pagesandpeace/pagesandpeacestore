"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type Product = {
  id: string;
  name: string;
};

type DraftWasteItem = {
  product_id: string;
  product_name: string;
  quantity: number;
};

type Props = {
  onClose: () => void;
};

export default function LogWasteModal({ onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [draftItems, setDraftItems] = useState<DraftWasteItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------
     LOAD PRODUCTS
  ------------------------------ */
  useEffect(() => {
    fetch("/api/admin/food/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setError("Failed to load products"));
  }, []);

  /* ------------------------------
     ADD TO DRAFT LIST
  ------------------------------ */
  function addItem() {
    if (!productId || quantity <= 0) return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setDraftItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity,
      },
    ]);

    setProductId("");
    setQuantity(1);
  }

  /* ------------------------------
     UPDATE / REMOVE DRAFT ITEMS
  ------------------------------ */
  function updateQuantity(index: number, value: number) {
    setDraftItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: value } : item
      )
    );
  }

  function removeItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  }

  /* ------------------------------
     SUBMIT TO API
  ------------------------------ */
  async function submit() {
    if (draftItems.length === 0) return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/food/waste/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: draftItems.map(({ product_id, quantity }) => ({
          product_id,
          quantity,
        })),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to log waste");
      return;
    }

    onClose();
  }

  /* ------------------------------
     UI
  ------------------------------ */
  return (
    <Modal onClose={onClose}>
      {/* 🔑 THIS WRAPPER IS THE FIX */}
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-auto">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            Log Food Waste
          </h2>

          {/* ADD ITEM */}
<div className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              className="w-20 border rounded px-2 py-1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Number(e.target.value))
              }
            />

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={!productId}
            >
              Add
            </Button>
          </div>

          {/* DRAFT TABLE */}
          {draftItems.length > 0 && (
            <div className="border rounded">
              {draftItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                >
                  <div className="flex-1">
                    {item.product_name}
                  </div>

                  <input
                    type="number"
                    min={1}
                    className="w-20 border rounded px-2 py-1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(
                        i,
                        Number(e.target.value)
                      )
                    }
                  />

                  <button
                    onClick={() => removeItem(i)}
                    className="text-red-600 font-semibold"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ERROR */}
          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            <Button
              variant="neutral"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={submit}
              disabled={draftItems.length === 0 || saving}
            >
              {saving ? "Saving…" : "Submit waste"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
