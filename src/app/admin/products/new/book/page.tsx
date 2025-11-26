"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Genre = { id: string; name: string };
type FormatType = "paperback" | "hardback" | "ebook";

export default function CreateBookProductPage() {
  const router = useRouter();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [book, setBook] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    image_url: "",
    genre_id: "",
    author: "",
    format: "paperback" as FormatType,
    language: "English",
    product_type: "book",
    inventory_count: 0,
    metadata: {
      isbn: "",
    },
  });

  // Load genres
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/products/genres");
        if (!res.ok) throw new Error("Failed to load genres");

        setGenres(await res.json());
      } catch {
        setError("Failed to load genres.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    setUploading(true);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Image upload failed");

      const data = await res.json();
      setBook({ ...book, image_url: data.imageUrl });
    } finally {
      setUploading(false);
    }
  }

  // Save book
  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save book");
      }

      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-10">Loading…</main>;

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-8 font-[Montserrat]">
      <h1 className="text-3xl font-bold">Add New Book</h1>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white shadow rounded-xl p-6 space-y-6">

        {/* Image */}
        <div>
          <label className="font-semibold block mb-2">Cover Image</label>

          {book.image_url && (
            <Image
              src={book.image_url}
              width={160}
              height={200}
              alt="Cover"
              className="rounded mb-4 object-cover"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm mt-2">Uploading…</p>}
        </div>

        {/* Name */}
        <div>
          <label className="font-semibold block mb-2">Title</label>
          <input
            className="w-full p-2 border rounded"
            value={book.name}
            onChange={(e) =>
              setBook({
                ...book,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              })
            }
          />
        </div>

        {/* Slug */}
        <div>
          <label className="font-semibold block mb-2">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={book.slug}
            readOnly
          />
        </div>

        {/* Author */}
        <div>
          <label className="font-semibold block mb-2">Author</label>
          <input
            className="w-full p-2 border rounded"
            value={book.author}
            onChange={(e) => setBook({ ...book, author: e.target.value })}
          />
        </div>

        {/* Price */}
        <div>
          <label className="font-semibold block mb-2">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={book.price}
            onChange={(e) => setBook({ ...book, price: Number(e.target.value) })}
          />
        </div>

        {/* Format */}
        <div>
          <label className="font-semibold block mb-2">Format</label>
          <select
            className="w-full p-2 border rounded"
            value={book.format}
            onChange={(e) =>
              setBook({ ...book, format: e.target.value as FormatType })
            }
          >
            <option value="paperback">Paperback</option>
            <option value="hardback">Hardback</option>
            <option value="ebook">eBook</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="font-semibold block mb-2">Language</label>
          <input
            className="w-full p-2 border rounded"
            value={book.language}
            onChange={(e) =>
              setBook({ ...book, language: e.target.value })
            }
          />
        </div>

        {/* ISBN */}
        <div>
          <label className="font-semibold block mb-2">ISBN</label>
          <input
            className="w-full p-2 border rounded"
            value={book.metadata.isbn}
            onChange={(e) =>
              setBook({
                ...book,
                metadata: { ...book.metadata, isbn: e.target.value },
              })
            }
          />
        </div>

        {/* Genre */}
        <div>
          <label className="font-semibold block mb-2">Genre</label>
          <select
            className="w-full p-2 border rounded"
            value={book.genre_id}
            onChange={(e) => setBook({ ...book, genre_id: e.target.value })}
          >
            <option value="">Uncategorised</option>
            {genres.map((g) => (
              <option value={g.id} key={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="font-semibold block mb-2">Description</label>
          <textarea
            className="w-full p-3 border rounded h-32"
            value={book.description}
            onChange={(e) => setBook({ ...book, description: e.target.value })}
          />
        </div>

        {/* Inventory */}
        <div>
          <label className="font-semibold block mb-2">Inventory Count</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={book.inventory_count}
            onChange={(e) =>
              setBook({ ...book, inventory_count: Number(e.target.value) })
            }
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Create Book"}
          </Button>

          <Button variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
        </div>
      </div>
    </main>
  );
}
