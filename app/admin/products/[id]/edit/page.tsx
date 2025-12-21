"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* ---------------------------------------------------
   TYPES
--------------------------------------------------- */
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  inventory_count: number;

  product_type: "book" | "merch" | string;

  // book-specific
  author: string | null;
  format: string | null;
  language: string | null;
  genre_id: string | null;
  vibe_id: string | null;
  theme_id: string | null;
}

interface MetaItem {
  id: string;
  name: string;
}

/* ---------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------- */
export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params); // ⭐ Correct Next.js 15 unwrapping

  /* ---------------------------------------------------
     STATE
  --------------------------------------------------- */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);

  // general
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventoryCount, setInventoryCount] = useState(0);
  const [imageUrl, setImageUrl] = useState("");

  // book-specific
  const [author, setAuthor] = useState("");
  const [genreId, setGenreId] = useState("");
  const [format, setFormat] = useState("");
  const [language, setLanguage] = useState("");
  const [vibeId, setVibeId] = useState("");
  const [themeId, setThemeId] = useState("");

  // metadata lists
  const [vibes, setVibes] = useState<MetaItem[]>([]);
  const [themes, setThemes] = useState<MetaItem[]>([]);
  const [genres, setGenres] = useState<MetaItem[]>([]);

  const isBook =
  product?.product_type === "book" ||
  product?.product_type === "blind-date";

  /* ---------------------------------------------------
     LOAD PRODUCT + META
  --------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        // fetch product
        const res = await fetch(`/api/admin/products/get/${id}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data: Product = await res.json();

        if (!res.ok) {
          setErrorMsg("Failed to load product.");
          setLoading(false);
          return;
        }

        setProduct(data);

        // general
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description ?? "");
        setPrice(data.price);
        setInventoryCount(data.inventory_count);
        setImageUrl(data.image_url ?? "");

        // book fields
        if (data.product_type === "book") {
          setAuthor(data.author ?? "");
          setGenreId(data.genre_id ?? "");
          setFormat(data.format ?? "");
          setLanguage(data.language ?? "");
          setVibeId(data.vibe_id ?? "");
          setThemeId(data.theme_id ?? "");
        }

        // meta lists
        const metaRes = await fetch("/api/admin/products/supporting-data", {
          credentials: "include",
        });
        const meta = await metaRes.json();

        setVibes(meta.vibes);
        setThemes(meta.themes);
        setGenres(meta.genres);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load product.");
        setLoading(false);
      }
    }

    load();
  }, [id]); // no eslint issues now

  if (loading) return <p className="p-10">Loading…</p>;

  /* ---------------------------------------------------
     IMAGE UPLOAD
  --------------------------------------------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
  }

  /* ---------------------------------------------------
     SAVE CHANGES
  --------------------------------------------------- */
  async function saveChanges() {
    if (!product) return;

    setSaving(true);
    setErrorMsg(null);

    const payload: Partial<Product> = {
      name,
      slug,
      description,
      price,
      inventory_count: inventoryCount,
      image_url: imageUrl || null,
    };

    if (isBook) {
      payload.author = author || null;
      payload.genre_id = genreId || null;
      payload.format = format || null;
      payload.language = language || null;
      payload.vibe_id = vibeId || null;
      payload.theme_id = themeId || null;
    }

    const res = await fetch(`/api/admin/products/update/${product.id}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setErrorMsg("Failed to save changes.");
      setSaving(false);
      return;
    }

    router.push(`/admin/products/${product.id}`);
  }

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Edit Product</h1>
      {errorMsg && <Alert type="error" message={errorMsg} />}

      {/* GENERAL FIELDS */}
      <div className="space-y-5 bg-white p-6 border rounded-lg shadow-sm">
        <div>
          <label className="block mb-1 text-sm">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 text-sm">Slug</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 text-sm">Description</label>
          <TextArea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Price (£)</label>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Stock</label>
          <Input
            type="number"
            value={inventoryCount}
            onChange={(e) => setInventoryCount(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Image</label>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="preview"
              width={200}
              height={200}
              className="border rounded object-cover"
            />
          )}
          <input type="file" onChange={handleUpload} />
        </div>
      </div>

      {/* BOOK FIELDS */}
      {isBook && (
        <div className="space-y-5 bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold">Book Details</h2>

          <div>
            <label className="block mb-1 text-sm">Author</label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Genre</label>
            <select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">None</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm">Format</label>
            <Input value={format} onChange={(e) => setFormat(e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Language</label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">Vibe</label>
            <select
              value={vibeId}
              onChange={(e) => setVibeId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">None</option>
              {vibes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm">Theme</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">None</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="primary" disabled={saving} onClick={saveChanges}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>

        <Button
          variant="neutral"
          onClick={() => router.push(`/admin/products/${product?.id}`)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
