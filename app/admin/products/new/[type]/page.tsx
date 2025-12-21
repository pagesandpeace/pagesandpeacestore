"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type ProductType = "book" | "blind-date" | "merch" | "other";

type CategoryOption = {
  id: string;
  name: string;
};

export default function AdminCreateProductPage() {
  const router = useRouter();
  const params = useParams();

  const productType = params.type as ProductType;

  /* -------------------------------
     Guard rail
  -------------------------------- */
  useEffect(() => {
    if (!["book", "blind-date", "merch", "other"].includes(productType)) {
      router.replace("/admin/products/new");
    }
  }, [productType, router]);

  const isBookLike = productType === "book" || productType === "blind-date";

  /* -------------------------------
     Form state
  -------------------------------- */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [inventoryCount, setInventoryCount] = useState<number>(0);

  // Book / Blind-date fields
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState("Paperback");
  const [language, setLanguage] = useState("English");

  // Categories
  const [genreId, setGenreId] = useState("");
  const [vibeId, setVibeId] = useState("");
  const [themeId, setThemeId] = useState("");

  const [genres, setGenres] = useState<CategoryOption[]>([]);
  const [vibes, setVibes] = useState<CategoryOption[]>([]);
  const [themes, setThemes] = useState<CategoryOption[]>([]);

  // Image upload
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------
     Load category data
  -------------------------------- */
  useEffect(() => {
    if (!isBookLike) return;

    async function loadSupportingData() {
      try {
        const res = await fetch("/api/admin/products/supporting-data", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to load categories");

        const data = await res.json();
        setGenres(data.genres || []);
        setVibes(data.vibes || []);
        setThemes(data.themes || []);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load category data.");
      }
    }

    loadSupportingData();
  }, [isBookLike]);

  /* -------------------------------
     Image upload
  -------------------------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/products/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  /* -------------------------------
     Submit
  -------------------------------- */
  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg(null);

    if (!name || price <= 0) {
      setSubmitting(false);
      setErrorMsg("Name and price are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      description,
      price,
      inventory_count: inventoryCount,
      image_url: imageUrl,
      product_type: productType,
    };

    if (isBookLike) {
      payload.author = author || null;
      payload.format = format || null;
      payload.language = language || null;

      payload.genre_id = genreId || null;
      payload.vibe_id = vibeId || null;
      payload.theme_id = themeId || null;
    }

    const res = await fetch("/api/admin/products/create", {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("CREATE PRODUCT FAILED:", text);
      setSubmitting(false);
      setErrorMsg("Failed to create product.");
      return;
    }

    router.push("/admin/products");
  }

  /* -------------------------------
     UI
  -------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">
        Create {productType.replace("-", " ")}
      </h1>

      {errorMsg && <Alert type="error" message={errorMsg} />}

      {/* NAME */}
      <div>
        <label className="block mb-1 text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* DESCRIPTION */}
      <div>
        <label className="block mb-1 text-sm font-medium">Description</label>
        <TextArea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* IMAGE */}
      <div>
        <label className="block mb-1 text-sm font-medium">Product Image</label>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span className="text-sm text-gray-500">
            {uploading ? "Uploading…" : "Click to upload image"}
          </span>
        </label>

        {imageUrl && (
          <div className="mt-3">
            <Image
              src={imageUrl}
              alt="Preview"
              width={300}
              height={300}
              className="object-cover rounded-lg border shadow"
            />
          </div>
        )}
      </div>

      {/* BOOK / BLIND-DATE FIELDS */}
      {isBookLike && (
        <>
          <div>
            <label className="block mb-1 text-sm font-medium">Author</label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Language</label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Format</label>
            <Input value={format} onChange={(e) => setFormat(e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Genre</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={genreId} onChange={(e) => setGenreId(e.target.value)}>
              <option value="">Select genre</option>
              {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Vibe</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={vibeId} onChange={(e) => setVibeId(e.target.value)}>
              <option value="">Select vibe</option>
              {vibes.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Theme</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              <option value="">Select theme</option>
              {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </>
      )}

      {/* PRICE */}
      <div>
        <label className="block mb-1 text-sm font-medium">Price (£)</label>
        <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </div>

      {/* INVENTORY */}
      <div>
        <label className="block mb-1 text-sm font-medium">Inventory Count</label>
        <Input type="number" value={inventoryCount} onChange={(e) => setInventoryCount(Number(e.target.value))} />
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Product"}
        </Button>

        <Button
          variant="neutral"
          onClick={() => router.push("/admin/products/new")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
