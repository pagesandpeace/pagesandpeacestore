"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import StockAdjustModal from "@/components/admin/StockAdjustModal";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

export interface BookMetadata {
  isbn: string;
}

export interface BookProduct {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string;
  image_url: string | null;
  genre_id: string | null;
  product_type: "book";
  inventory_count: number;
  author: string;
  format: string;
  language: string;
  metadata: BookMetadata;
}

type Genre = {
  id: string;
  name: string;
};

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function EditBookPage({ initial }: { initial: BookProduct }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  const [showStockModal, setShowStockModal] = useState(false);

  /* -------------------------------------------------------
     LOAD GENRES
  ------------------------------------------------------- */
  useEffect(() => {
    async function loadGenres() {
      try {
        const res = await fetch("/api/admin/products/genres");
        const data = await res.json();
        setGenres(data);
      } catch (err) {
        console.error("GENRE LOAD FAILED", err);
      } finally {
        setLoadingGenres(false);
      }
    }
    loadGenres();
  }, []);

  /* -------------------------------------------------------
     FORM STATE
  ------------------------------------------------------- */
  const [form, setForm] = useState({
    name: initial.name,
    slug: initial.slug,
    price: Number(initial.price),
    description: initial.description ?? "",
    genre_id: initial.genre_id ?? "",
    image_url: initial.image_url ?? null,
    product_type: "book" as const,
    inventory_count: initial.inventory_count ?? 0,
    author: initial.author ?? "",
    format: initial.format ?? "paperback",
    language: initial.language ?? "English",
    metadata: {
      isbn: initial.metadata?.isbn ?? "",
    } as BookMetadata,
  });

  /* -------------------------------------------------------
     SLUG
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
      <h1 className="text-3xl font-bold">Edit Book</h1>
      {error && <Alert type="error" message={error} />}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">

        {/* Name */}
        <div>
          <label className="font-semibold">Name</label>
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

        {/* Slug */}
        <div>
          <label className="font-semibold">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={form.slug}
            readOnly
          />
        </div>

        {/* Author */}
        <div>
          <label className="font-semibold">Author</label>
          <input
            className="w-full p-2 border rounded"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </div>

        {/* Price */}
        <div>
          <label className="font-semibold">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </div>

        {/* Format */}
        <div>
          <label className="font-semibold">Format</label>
          <select
            className="w-full p-2 border rounded"
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
          >
            <option value="paperback">Paperback</option>
            <option value="hardback">Hardback</option>
            <option value="ebook">eBook</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="font-semibold">Language</label>
          <input
            className="w-full p-2 border rounded"
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value })
            }
          />
        </div>

        {/* ISBN */}
        <div>
          <label className="font-semibold">ISBN</label>
          <input
            className="w-full p-2 border rounded"
            value={form.metadata.isbn}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, isbn: e.target.value },
              })
            }
          />
        </div>

        {/* Genre */}
        <div>
          <label className="font-semibold">Genre</label>

          {loadingGenres ? (
            <p>Loading genres…</p>
          ) : (
            <select
              className="w-full p-2 border rounded"
              value={form.genre_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, genre_id: e.target.value })
              }
            >
              <option value="">Uncategorised</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="font-semibold">Description</label>
          <textarea
            className="w-full p-3 border rounded h-32"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        {/* CURRENT INVENTORY + BUTTON */}
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

        {/* Image */}
        <div>
          <label className="font-semibold">Image</label>
          {form.image_url && (
            <Image
              src={form.image_url}
              alt="Preview"
              width={160}
              height={160}
              className="rounded mb-4"
            />
          )}
          <input type="file" onChange={handleImageUpload} />
          {uploading && <p>Uploading…</p>}
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Book"}
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
