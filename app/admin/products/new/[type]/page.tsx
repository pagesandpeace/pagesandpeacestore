"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type GenericProductType = "merch" | "other";

export default function AdminCreateGenericProductPage() {
  const router = useRouter();
  const params = useParams();

  const productType = params.type as GenericProductType;

  /* --------------------------------
     Guard rail
  -------------------------------- */
  useEffect(() => {
    if (productType !== "merch" && productType !== "other") {
      router.replace("/admin/products/new");
    }
  }, [productType, router]);

  /* --------------------------------
     Form state
  -------------------------------- */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [inventoryCount, setInventoryCount] = useState<number>(0);

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* --------------------------------
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

  /* --------------------------------
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

    const payload = {
      name,
      description,
      price, // send as number; cast server-side if needed
      inventory_count: inventoryCount,
      product_type: productType,
      image_url: imageUrl,
    };

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

  /* --------------------------------
     UI
  -------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">
        Create {productType === "merch" ? "Merch" : "Product"}
      </h1>

      <p className="text-sm text-gray-500 mb-8">
        {productType === "merch"
          ? "Physical merchandise sold in-store or for pickup."
          : "General non-book product."}
      </p>

      <div className="space-y-6">
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

        {/* PRICE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Price (£) *</label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>

        {/* INVENTORY */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Inventory Count
          </label>
          <Input
            type="number"
            min={0}
            value={inventoryCount}
            onChange={(e) => setInventoryCount(Number(e.target.value))}
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Product Image
          </label>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />

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

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button
            variant="primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Creating…" : "Create Product"}
          </Button>

          <Button
            variant="neutral"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
