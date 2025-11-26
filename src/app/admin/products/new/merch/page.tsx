"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function CreateMerchProductPage() {
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [merch, setMerch] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    imageUrl: "",
    productType: "merch",
    inventoryCount: 0,
    colour: "",
    size: "",
    material: "",
    metadata: {},
  });

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

      if (!res.ok) {
        alert("Upload failed");
        return;
      }

      const data = await res.json();
      setMerch({ ...merch, imageUrl: data.imageUrl });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merch),
      });

      if (!res.ok) throw new Error("Save failed");

      router.push("/admin/products");
    } catch {
      setError("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 font-[Montserrat] space-y-8">
      <h1 className="text-3xl font-bold">Add Merch Product</h1>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">
        
        {/* NAME */}
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            className="w-full p-2 border rounded"
            value={merch.name}
            onChange={(e) => setMerch({ ...merch, name: e.target.value })}
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="block font-semibold mb-1">Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={merch.price}
            onChange={(e) =>
              setMerch({ ...merch, price: Number(e.target.value) })
            }
          />
        </div>

        {/* COLOUR */}
        <div>
          <label className="block font-semibold mb-1">Colour</label>
          <input
            className="w-full p-2 border rounded"
            value={merch.colour}
            onChange={(e) =>
              setMerch({ ...merch, colour: e.target.value })
            }
          />
        </div>

        {/* SIZE */}
        <div>
          <label className="block font-semibold mb-1">Size (optional)</label>
          <input
            className="w-full p-2 border rounded"
            value={merch.size}
            onChange={(e) =>
              setMerch({ ...merch, size: e.target.value })
            }
          />
        </div>

        {/* MATERIAL */}
        <div>
          <label className="block font-semibold mb-1">Material</label>
          <input
            className="w-full p-2 border rounded"
            value={merch.material}
            onChange={(e) =>
              setMerch({ ...merch, material: e.target.value })
            }
          />
        </div>

        {/* INVENTORY */}
        <div>
          <label className="block font-semibold mb-1">Inventory Count</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={merch.inventoryCount}
            onChange={(e) =>
              setMerch({
                ...merch,
                inventoryCount: Number(e.target.value),
              })
            }
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="block font-semibold mb-1">Image</label>

          {merch.imageUrl && (
            <Image
              src={merch.imageUrl}
              alt="Merch image"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading…</p>}
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Create Merch Product"}
        </Button>
      </div>
    </main>
  );
}
