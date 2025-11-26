"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

export interface CoffeeMetadata {
  roast: string;
  origin: string;
  weight: string;
  grind: string;
  tasting_notes: string;
}

export interface CoffeeProduct {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string;
  image_url: string | null;
  genre_id: string | null;
  product_type: "coffee";
  inventory_count: number;
  metadata: CoffeeMetadata;
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function EditCoffeePage({ initial }: { initial: CoffeeProduct }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------------
     FORM STATE
  ------------------------------------------------------- */
  const [form, setForm] = useState({
    name: initial.name,
    slug: initial.slug,
    price: Number(initial.price),
    description: initial.description ?? "",
    genre_id: initial.genre_id ?? null,
    product_type: "coffee" as const,
    image_url: initial.image_url ?? null,
    inventory_count: initial.inventory_count ?? 0,
    metadata: {
      roast: initial.metadata?.roast ?? "",
      origin: initial.metadata?.origin ?? "",
      weight: initial.metadata?.weight ?? "",
      grind: initial.metadata?.grind ?? "",
      tasting_notes: initial.metadata?.tasting_notes ?? "",
    } as CoffeeMetadata,
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

    const fd = new FormData();
    fd.append("file", file);

    setUploading(true);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      setForm({ ...form, image_url: data.imageUrl });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      <h1 className="text-3xl font-bold">Edit Coffee</h1>
      {error && <Alert type="error" message={error} />}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">

        {/* NAME */}
        <div>
          <label className="font-semibold block mb-2">Name</label>
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
          <label className="font-semibold block mb-2">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={form.slug}
            readOnly
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="font-semibold block mb-2">Description</label>
          <textarea
            className="w-full p-2 border rounded h-32"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="font-semibold block mb-2">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </div>

        {/* ROAST */}
        <div>
          <label className="font-semibold block mb-2">Roast</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.roast}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, roast: e.target.value },
              })
            }
          />
        </div>

        {/* ORIGIN */}
        <div>
          <label className="font-semibold block mb-2">Origin</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.origin}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, origin: e.target.value },
              })
            }
          />
        </div>

        {/* WEIGHT */}
        <div>
          <label className="font-semibold block mb-2">Weight</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.weight}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, weight: e.target.value },
              })
            }
          />
        </div>

        {/* GRIND */}
        <div>
          <label className="font-semibold block mb-2">Grind</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.grind}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, grind: e.target.value },
              })
            }
          />
        </div>

        {/* TASTING NOTES */}
        <div>
          <label className="font-semibold block mb-2">Tasting Notes</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.tasting_notes}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, tasting_notes: e.target.value },
              })
            }
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="font-semibold block mb-2">Image</label>

          {form.image_url && (
            <Image
              src={form.image_url}
              alt="Coffee image"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm mt-1">Uploading…</p>}
        </div>

        {/* SAVE */}
        <div className="pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Coffee"}
          </Button>
        </div>

      </div>
    </main>
  );
}
