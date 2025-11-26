"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* ----------------------------------------
   TYPES
---------------------------------------- */

type Genre = { id: string; name: string };

type ProductType =
  | "book"
  | "coffee"
  | "merch"
  | "blind-date"
  | "physical";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  image_url: string | null;
  genre_id: string | null;
  product_type: ProductType;
  inventory_count: number;
  metadata: Record<string, unknown> | null;
}

/* ----------------------------------------
   COMPONENT
---------------------------------------- */

export default function EditProductPage({ id }: { id: string }) {
  const router = useRouter();
  const productId = id;

  const [product, setProduct] = useState<Product | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------------------
     LOAD PRODUCT + GENRES
  ---------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const [pRes, gRes] = await Promise.all([
          fetch(`/api/admin/products/${productId}`),
          fetch("/api/admin/products/genres"),
        ]);

        if (!pRes.ok) throw new Error("Failed to load product");
        if (!gRes.ok) throw new Error("Failed to load genres");

        const productData: Product = await pRes.json();
        const genreData: Genre[] = await gRes.json();

        setProduct(productData);
        setGenres(genreData);
      } catch {
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [productId]);

  /* ----------------------------------------
     IMAGE UPLOAD
  ---------------------------------------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    const form = new FormData();
    form.append("file", file);

    setUploading(true);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: form,
      });

      if (!res.ok) return alert("Image upload failed.");

      const data = await res.json();

      setProduct({ ...product, image_url: data.url });
    } finally {
      setUploading(false);
    }
  }

  /* ----------------------------------------
     SAVE
  ---------------------------------------- */
  async function handleSave() {
    if (!product) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) throw new Error("Failed to save");
      router.push("/admin/products");
    } catch {
      alert("Error saving product.");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------------------
     DELETE
  ---------------------------------------- */
  async function handleDelete() {
    if (!confirm("Delete this product?")) return;

    await fetch(`/api/admin/products/${productId}/delete`, { method: "DELETE" });
    router.push("/admin/products");
  }

  /* ----------------------------------------
     RENDER LOGIC
  ---------------------------------------- */
  if (loading) {
    return (
      <main className="p-10">
        <p className="text-lg">Loading…</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-xl mx-auto p-10">
        <Alert type="error" message={error ?? "Product not found."} />
      </main>
    );
  }

  /* ----------------------------------------
     MAIN RENDER
  ---------------------------------------- */
  return (
    <main className="max-w-3xl mx-auto py-10 space-y-8 font-[Montserrat]">
      <h1 className="text-3xl font-bold">Edit Product</h1>

      <div className="bg-white shadow rounded-xl p-6 space-y-6">
        {/* NAME */}
        <div>
          <label className="block mb-2 font-semibold">Name</label>
          <input
            className="w-full p-2 border rounded"
            value={product.name}
            onChange={(e) =>
              setProduct({ ...product, name: e.target.value })
            }
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="block mb-2 font-semibold">Price (£)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="w-full p-2 border rounded"
            value={product.price}
            onChange={(e) =>
              setProduct({ ...product, price: Number(e.target.value) })
            }
          />
        </div>

        {/* PRODUCT TYPE */}
        <div>
          <label className="block mb-2 font-semibold">Product Type</label>
          <select
            className="w-full p-2 border rounded"
            value={product.product_type}
            onChange={(e) =>
              setProduct({
                ...product,
                product_type: e.target.value as ProductType,
              })
            }
          >
            <option value="book">Book</option>
            <option value="coffee">Coffee</option>
            <option value="merch">Merch</option>
            <option value="blind-date">Blind-Date Book</option>
            <option value="physical">Gift / Physical Item</option>
          </select>
        </div>

        {/* GENRE */}
        <div>
          <label className="block mb-2 font-semibold">Genre</label>
          <select
            className="w-full p-2 border rounded"
            value={product.genre_id ?? ""}
            onChange={(e) =>
              setProduct({ ...product, genre_id: e.target.value || null })
            }
          >
            <option value="">Uncategorised</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block mb-2 font-semibold">Description</label>
          <textarea
            className="w-full p-3 border rounded h-32"
            value={product.description}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
          />
        </div>

        {/* INVENTORY */}
        <div>
          <label className="block mb-2 font-semibold">Inventory Count</label>
          <input
            type="number"
            min={0}
            className="w-full p-2 border rounded"
            value={product.inventory_count}
            onChange={(e) =>
              setProduct({
                ...product,
                inventory_count: Number(e.target.value),
              })
            }
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="block mb-2 font-semibold">Image</label>

          {product.image_url && (
            <Image
              src={product.image_url}
              alt="Product image"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm text-gray-500 mt-2">Uploading…</p>}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>

          <Button variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>

          <Button
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            type="button"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </main>
  );
}
