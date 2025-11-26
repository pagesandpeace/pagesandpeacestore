"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function CreateSubscriptionBoxPage() {
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [box, setBox] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    imageUrl: "",
    productType: "subscription",
    isSubscription: true,
    billingInterval: "monthly",
    itemsIncluded: "",
    inventoryCount: 0,
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
      setBox({ ...box, imageUrl: data.imageUrl });
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
        body: JSON.stringify(box),
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
    <main className="max-w-3xl mx-auto py-10 space-y-8 font-[Montserrat]">
      <h1 className="text-3xl font-bold">Create Subscription Box</h1>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">
        
        {/* NAME */}
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            className="w-full p-2 border rounded"
            value={box.name}
            onChange={(e) => setBox({ ...box, name: e.target.value })}
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="block font-semibold mb-1">Monthly Price (£)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={box.price}
            onChange={(e) =>
              setBox({ ...box, price: Number(e.target.value) })
            }
          />
        </div>

        {/* BILLING INTERVAL */}
        <div>
          <label className="block font-semibold mb-1">Billing Interval</label>
          <select
            className="w-full p-2 border rounded"
            value={box.billingInterval}
            onChange={(e) =>
              setBox({ ...box, billingInterval: e.target.value })
            }
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {/* ITEMS INCLUDED */}
        <div>
          <label className="block font-semibold mb-1">Items Included</label>
          <textarea
            className="w-full p-3 border rounded"
            placeholder="e.g. 1 book, 1 coffee, bookmark"
            value={box.itemsIncluded}
            onChange={(e) =>
              setBox({ ...box, itemsIncluded: e.target.value })
            }
          />
        </div>

        {/* INVENTORY */}
        <div>
          <label className="block font-semibold mb-1">Inventory Count</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={box.inventoryCount}
            onChange={(e) =>
              setBox({
                ...box,
                inventoryCount: Number(e.target.value),
              })
            }
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="block font-semibold mb-1">Image</label>

          {box.imageUrl && (
            <Image
              src={box.imageUrl}
              alt="Subscription box image"
              width={200}
              height={200}
              className="rounded mb-3"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <p className="text-sm">Uploading…</p>}
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Create Subscription Box"}
        </Button>
      </div>
    </main>
  );
}
