"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

// Dropdown values
const THEMES = [
  "Cosy Winter",
  "Autumn Warmth",
  "Spring Blossom",
  "Summer Escape",
  "BookTok Pick",
  "Mystery Surprise",
  "Feel-Good Pick",
  "Late-Night Read",
  "Weekend Getaway",
  "Staff Favourite",
  "Dark Academia",
  "Light Academia",
  "Coffeehouse Reads",
  "Valentine’s Edition",
  "Christmas Special",
  "Limited Edition",
];

const COLOURS = [
  "Brown Kraft",
  "Cream",
  "White",
  "Pink",
  "Red",
  "Navy",
  "Forest Green",
  "Pastel Blue",
  "Pastel Yellow",
  "Burgundy",
  "Black",
];

const VIBES = [
  "Wholesome",
  "Heartwarming",
  "Emotional",
  "Spicy",
  "Chilling",
  "Atmospheric",
  "Dark",
  "Cute",
  "Funny",
  "Thought-Provoking",
  "Fast-Paced",
  "Slow Burn",
  "Romantic",
  "Adventure",
  "Uplifting",
];

export default function CreateBlindDatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    image_url: "",
    product_type: "blind-date",
    inventory_count: 0,
    is_subscription: false,

    metadata: {
      theme: "",
      colour: "",
      vibe: "",
      items: [] as string[],
    },
  });

  const [newItem, setNewItem] = useState("");

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);

    const res = await fetch("/api/admin/products/upload-image", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setForm({ ...form, image_url: data.imageUrl });
    setUploading(false);
  }

  function handleAddItem() {
    if (!newItem.trim()) return;

    setForm({
      ...form,
      metadata: {
        ...form.metadata,
        items: [...form.metadata.items, newItem.trim()],
      },
    });

    setNewItem("");
  }

  function handleRemoveItem(i: number) {
    setForm({
      ...form,
      metadata: {
        ...form.metadata,
        items: form.metadata.items.filter((_, idx) => idx !== i),
      },
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-8 font-[Montserrat]">
      <h1 className="text-3xl font-bold">Create Blind-Date Book</h1>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white rounded-xl shadow p-6 space-y-6">

        {/* Name */}
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

        {/* Slug */}
        <div>
          <label className="font-semibold mb-2 block">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={form.slug}
            readOnly
          />
        </div>

        {/* Price */}
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

        {/* Inventory */}
        <div>
          <label className="font-semibold mb-2 block">Inventory Count</label>
          <input
            type="number"
            min={0}
            className="w-full p-2 border rounded"
            value={form.inventory_count}
            onChange={(e) =>
              setForm({
                ...form,
                inventory_count: Number(e.target.value),
              })
            }
          />
        </div>

        {/* Description */}
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

        {/* Theme */}
        <div>
          <label className="font-semibold mb-2 block">Theme</label>
          <select
            className="w-full p-2 border rounded"
            value={form.metadata.theme}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, theme: e.target.value },
              })
            }
          >
            <option value="">Select theme</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Colour */}
        <div>
          <label className="font-semibold mb-2 block">Colour</label>
          <select
            className="w-full p-2 border rounded"
            value={form.metadata.colour}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, colour: e.target.value },
              })
            }
          >
            <option value="">Select colour</option>
            {COLOURS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Vibe */}
        <div>
          <label className="font-semibold mb-2 block">Vibe</label>
          <select
            className="w-full p-2 border rounded"
            value={form.metadata.vibe}
            onChange={(e) =>
              setForm({
                ...form,
                metadata: { ...form.metadata, vibe: e.target.value },
              })
            }
          >
            <option value="">Select vibe</option>
            {VIBES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div>
          <label className="font-semibold mb-2 block">Included Items</label>

          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border rounded"
              placeholder="e.g., Hot chocolate"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <Button onClick={handleAddItem}>Add</Button>
          </div>

          {form.metadata.items.length > 0 && (
            <ul className="mt-3 space-y-1">
              {form.metadata.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex justify-between bg-gray-50 p-2 rounded"
                >
                  {item}
                  <button
                    className="text-red-600"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Image */}
        <div>
          <label className="font-semibold mb-2 block">Image</label>
          {form.image_url && (
            <Image
              src={form.image_url}
              width={200}
              height={200}
              alt="Preview"
              className="rounded mb-3"
            />
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p>Uploading…</p>}
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Create Blind-Date Book"}
        </Button>
      </div>
    </main>
  );
}
