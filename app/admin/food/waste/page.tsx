"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
};

export default function FoodWastePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/admin/food/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  async function submit() {
    setSaving(true);
    setDone(false);

    const res = await fetch("/api/admin/food/waste/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setDone(true);
      setQuantity(1);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">
        Log Food Waste
      </h1>

      <select
        className="w-full border rounded px-2 py-1"
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
        className="w-full border rounded px-2 py-1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />

      <button
        onClick={submit}
        disabled={!productId || saving}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Logging…" : "Log waste"}
      </button>

      {done && (
        <p className="text-sm text-green-700">
          ✅ Waste recorded
        </p>
      )}
    </div>
  );
}
