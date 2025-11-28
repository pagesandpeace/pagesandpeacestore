"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const roastLevels = ["Light", "Medium", "Medium-Dark", "Dark"];

export default function CreateCoffeeProductPage() {
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coffee, setCoffee] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    image_url: "",
    product_type: "coffee",
    inventory_count: 0,
    metadata: {
      origin: "",
      roast: "",
      weight: "",
      grind: "",
      tasting_notes: "",
    },
  });

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

    const form = new FormData();
    form.append("file", file);

    setUploading(true);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setCoffee({ ...coffee, image_url: data.imageUrl });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coffee),
      });

      if (!res.ok) throw new Error("Save failed");

      router.push("/admin/products");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 font-[Montserrat] space-y-8">
      <h1 className="text-3xl font-bold">Add Coffee Product</h1>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white shadow p-6 rounded-xl space-y-6">

        {/* NAME */}
        <div>
          <label className="font-semibold block mb-1">Name</label>
          <input
            className="w-full p-2 border rounded"
            value={coffee.name}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              })
            }
          />
        </div>

        {/* SLUG */}
        <div>
          <label className="font-semibold block mb-1">Slug</label>
          <input
            className="w-full p-2 border rounded bg-gray-100"
            value={coffee.slug}
            readOnly
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="font-semibold block mb-1">Description</label>
          <textarea
            className="w-full p-2 border rounded h-32"
            value={coffee.description}
            onChange={(e) =>
              setCoffee({ ...coffee, description: e.target.value })
            }
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="font-semibold block mb-1">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={coffee.price}
            onChange={(e) =>
              setCoffee({ ...coffee, price: Number(e.target.value) })
            }
          />
        </div>

        {/* ORIGIN */}
        <div>
          <label className="font-semibold block mb-1">Origin</label>
          <input
            className="w-full p-2 border rounded"
            value={coffee.metadata.origin}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                metadata: { ...coffee.metadata, origin: e.target.value },
              })
            }
          />
        </div>

        {/* ROAST */}
        <div>
          <label className="font-semibold block mb-1">Roast Level</label>
          <select
            className="w-full p-2 border rounded"
            value={coffee.metadata.roast}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                metadata: { ...coffee.metadata, roast: e.target.value },
              })
            }
          >
            <option value="">Select roast…</option>
            {roastLevels.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* WEIGHT */}
        <div>
          <label className="font-semibold block mb-1">Weight</label>
          <input
            className="w-full p-2 border rounded"
            value={coffee.metadata.weight}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                metadata: { ...coffee.metadata, weight: e.target.value },
              })
            }
          />
        </div>

        {/* GRIND */}
        <div>
          <label className="font-semibold block mb-1">Grind</label>
          <input
            className="w-full p-2 border rounded"
            value={coffee.metadata.grind}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                metadata: { ...coffee.metadata, grind: e.target.value },
              })
            }
          />
        </div>

        {/* TASTING NOTES */}
        <div>
          <label className="font-semibold block mb-1">Tasting Notes</label>
          <input
            className="w-full p-2 border rounded"
            value={coffee.metadata.tasting_notes}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                metadata: { ...coffee.metadata, tasting_notes: e.target.value },
              })
            }
          />
        </div>

        {/* INVENTORY */}
        <div>
          <label className="font-semibold block mb-1">Inventory Count</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={coffee.inventory_count}
            onChange={(e) =>
              setCoffee({
                ...coffee,
                inventory_count: Number(e.target.value),
              })
            }
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="font-semibold block mb-1">Image</label>

          {coffee.image_url && (
            <Image
              src={coffee.image_url}
              alt="Coffee product"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm mt-1">Uploading…</p>}
        </div>

        {/* SAVE */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Create Coffee Product"}
        </Button>
      </div>
    </main>
  );
}
