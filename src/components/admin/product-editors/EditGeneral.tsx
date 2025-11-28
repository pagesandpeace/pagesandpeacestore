"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import StockAdjustModal from "@/components/admin/StockAdjustModal";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

export interface GeneralMetadata {
  [key: string]: string | number | boolean | null;
}

export interface GeneralProduct {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string;
  image_url: string | null;
  product_type: string;
  inventory_count: number;
  metadata: GeneralMetadata;
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function EditGeneralPage({ initial }: { initial: GeneralProduct }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showStockModal, setShowStockModal] = useState(false);

  const [form, setForm] = useState({
    name: initial.name,
    slug: initial.slug,
    price: Number(initial.price),
    description: initial.description ?? "",
    image_url: initial.image_url ?? null,
    product_type: initial.product_type ?? "physical",
    inventory_count: initial.inventory_count ?? 0,
    metadata: initial.metadata ?? {},
  });

  /* -------------------------------------------------------
     SLUG GENERATOR
  ------------------------------------------------------- */
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* -------------------------------------------------------
     IMAGE UPLOAD
  ------------------------------------------------------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      setForm((prev) => ({ ...prev, image_url: data.imageUrl }));
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------------------------------
     SAVE
  ------------------------------------------------------- */
  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/products/${initial.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(await res.text());

      window.location.href = "/admin/products";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <main className="max-w-3xl mx-auto py-10 space-y-8 font-[Montserrat]">
      <h1 className="text-3xl font-bold">Edit Product</h1>
      {error && <Alert type="error" message={error} />}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">

        {/* NAME */}
        <div>
          <label className="font-semibold mb-2 block">Name</label>
          <input
            className="w-full p-2 border rounded"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              })
            }
          />
        </div>

        {/* SLUG */}
        <div>
          <label className="font-semibold mb-2 block">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={form.slug}
            readOnly
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="font-semibold mb-2 block">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="font-semibold mb-2 block">Description</label>
          <textarea
            className="w-full p-3 border rounded h-32"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        {/* INVENTORY (DISPLAY ONLY) */}
        <div className="border rounded p-4 bg-gray-50">
          <p className="font-semibold mb-1">Current Inventory</p>
          <p className="text-xl font-bold">{form.inventory_count}</p>

          <button
            type="button"
            onClick={() => setShowStockModal(true)}
            className="mt-3 px-4 py-2 bg-accent text-white rounded-lg font-semibold"
          >
            Adjust Stock
          </button>
        </div>

        {/* IMAGE */}
        <div>
          <label className="font-semibold mb-2 block">Image</label>

          {form.image_url && (
            <Image
              src={form.image_url}
              alt="Image"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />

          {uploading && (
            <p className="text-sm text-gray-500 mt-1">Uploading…</p>
          )}
        </div>

        {/* SAVE BUTTON */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Product"}
        </Button>
      </div>

      {/* STOCK MODAL */}
      {showStockModal && (
        <StockAdjustModal
          productId={initial.id}
          currentStock={form.inventory_count}
          onClose={() => {
            setShowStockModal(false);
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
