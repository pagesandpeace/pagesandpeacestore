"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import AuthorSearchSelect from "@/components/admin/AuthorSearchSelect";
import SupplierLinkSection from "@/components/admin/SupplierLinkSection";
import PricingAssistant from "@/components/admin/PricingAssistant";

/* ---------------------------------------------------
   TYPES
--------------------------------------------------- */
type ProductType = "book" | "blind-date" | "merch" | "other";
type FulfilmentMode = "made_to_order" | "physical";
type CommercialModel = "wholesale" | "consignment" | "owned_stock";
type OutOfStockBehavior = "stop_selling" | "switch_to_made_to_order";

type CategoryOption = {
  id: string;
  name: string;
};

/* ---------------------------------------------------
   CONFIG
--------------------------------------------------- */
const DEFAULT_MARKUP_PERCENT = 30;

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */
function calculateRetailPrice(
  supplierPrice: number,
  markupPercent: number
) {
  if (supplierPrice <= 0 || markupPercent < 0) return 0;
  return Math.ceil(supplierPrice * (1 + markupPercent / 100));
}

/* ---------------------------------------------------
   COMPONENT
--------------------------------------------------- */
export default function AdminCreateProductPage() {
  const router = useRouter();
  const params = useParams();

  const productType = params.type as ProductType;
  const isBookLike = productType === "book" || productType === "blind-date";

  /* -------------------------------
     Guard rail
  -------------------------------- */
  useEffect(() => {
    if (!["book", "blind-date", "merch", "other"].includes(productType)) {
      router.replace("/admin/products/new");
    }
  }, [productType, router]);

  /* -------------------------------
     Form state
  -------------------------------- */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 🔹 supplier link (NEW)
  const [supplier, setSupplier] = useState("");
  const [supplierRef, setSupplierRef] = useState("");

  // pricing
  const [supplierPrice, setSupplierPrice] = useState<number>(0);
  const [markupPercent, setMarkupPercent] =
    useState<number>(DEFAULT_MARKUP_PERCENT);
  const [price, setPrice] = useState<number>(0);

  // fulfilment
  const [fulfilmentMode, setFulfilmentMode] =
    useState<FulfilmentMode>("made_to_order");
  const [inventoryCount, setInventoryCount] = useState<number>(0);

  // commercial
  const [commercialModel, setCommercialModel] =
    useState<CommercialModel>("wholesale");

  // out of stock behaviour
  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<OutOfStockBehavior>("stop_selling");

  // book / blind-date
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [format, setFormat] = useState("Paperback");
  const [language, setLanguage] = useState("English");

  // categories
  const [genreId, setGenreId] = useState("");
  const [vibeId, setVibeId] = useState("");
  const [themeId, setThemeId] = useState("");

  const [genres, setGenres] = useState<CategoryOption[]>([]);
  const [vibes, setVibes] = useState<CategoryOption[]>([]);
  const [themes, setThemes] = useState<CategoryOption[]>([]);

  // image upload
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
      const res = await fetch("/api/admin/products/supporting-data", {
        credentials: "include",
      });

      if (!res.ok) {
        setErrorMsg("Failed to load categories.");
        return;
      }

      const data = await res.json();
      setGenres(data.genres || []);
      setVibes(data.vibes || []);
      setThemes(data.themes || []);
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
      setErrorMsg("Name and retail price are required.");
      return;
    }

    if (isBookLike && (!genreId || !vibeId || !themeId)) {
      setSubmitting(false);
      setErrorMsg("Genre, vibe and theme are required for books.");
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      description,
      product_type: productType,
      image_url: imageUrl || null,

      supplier_price: supplierPrice || null,
      markup_percent: markupPercent,
      price,

      fulfilment_mode: fulfilmentMode,
      commercial_model: commercialModel,
      supply_source:
        fulfilmentMode === "made_to_order" ? "supplier" : "stock",

      out_of_stock_behavior: outOfStockBehavior,
      inventory_count:
        fulfilmentMode === "physical" ? inventoryCount : 0,

      // 🔹 supplier link
      supplier,
      supplier_ref: supplierRef,
    };

    if (isBookLike) {
      payload.author_id = authorId || null;
      payload.format = format || null;
      payload.language = language || null;
      payload.genre_id = genreId;
      payload.vibe_id = vibeId;
      payload.theme_id = themeId;
    }

    const res = await fetch("/api/admin/products/create", {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
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

      <div>
        <label className="block mb-1 text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

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

      {/* SUPPLIER (NEW) */}
      <SupplierLinkSection
        supplier={supplier}
        supplierRef={supplierRef}
        onChange={(key, value) =>
          key === "supplier"
            ? setSupplier(value)
            : setSupplierRef(value)
        }
      />

      {/* FULFILMENT */}
      <div>
        <label className="block mb-1 text-sm font-medium">Fulfilment</label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={fulfilmentMode}
          onChange={(e) =>
            setFulfilmentMode(e.target.value as FulfilmentMode)
          }
        >
          <option value="made_to_order">
            Made to order (supplier fulfilment)
          </option>
          <option value="physical">Physical stock (in shop)</option>
        </select>
      </div>

      {/* COMMERCIAL */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          Commercial model
        </label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={commercialModel}
          onChange={(e) =>
            setCommercialModel(e.target.value as CommercialModel)
          }
        >
          <option value="wholesale">Supplier / trade</option>
          <option value="consignment">Consignment</option>
          <option value="owned_stock">Owned stock</option>
        </select>
      </div>

      {/* OUT OF STOCK */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          When stock reaches zero
        </label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={outOfStockBehavior}
          onChange={(e) =>
            setOutOfStockBehavior(e.target.value as OutOfStockBehavior)
          }
        >
          <option value="stop_selling">Stop selling</option>
          <option value="switch_to_made_to_order">
            Switch to made-to-order
          </option>
        </select>
      </div>

      {fulfilmentMode === "physical" && (
        <div>
          <label className="block mb-1 text-sm font-medium">
            Inventory Count
          </label>
          <Input
            type="number"
            value={inventoryCount}
            onChange={(e) =>
              setInventoryCount(Number(e.target.value))
            }
          />
        </div>
      )}

      {/* PRICING (REPLACED) */}
      <PricingAssistant
        supplierPrice={supplierPrice}
        markupPercent={markupPercent}
        price={price}
        onSupplierPriceChange={(v) => {
          setSupplierPrice(v);
          setPrice(calculateRetailPrice(v, markupPercent));
        }}
        onMarkupChange={(v) => {
          setMarkupPercent(v);
          setPrice(calculateRetailPrice(supplierPrice, v));
        }}
        onPriceChange={setPrice}
      />

      {/* BOOK */}
      {isBookLike && (
        <>
          <div>
            <label className="block mb-1 text-sm font-medium">Author</label>
            <AuthorSearchSelect value={authorId} onChange={setAuthorId} />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Language</label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Format</label>
            <Input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            />
          </div>

          <div>
  <label className="block mb-1 text-sm font-medium">Genre *</label>
  <select
    className="w-full border rounded-md px-3 py-2"
    value={genreId}
    onChange={(e) => setGenreId(e.target.value)}
  >
    <option value="">Select genre</option>
    {genres.map((g) => (
      <option key={g.id} value={g.id}>
        {g.name}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="block mb-1 text-sm font-medium">Vibe *</label>
  <select
    className="w-full border rounded-md px-3 py-2"
    value={vibeId}
    onChange={(e) => setVibeId(e.target.value)}
  >
    <option value="">Select vibe</option>
    {vibes.map((v) => (
      <option key={v.id} value={v.id}>
        {v.name}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="block mb-1 text-sm font-medium">Theme *</label>
  <select
    className="w-full border rounded-md px-3 py-2"
    value={themeId}
    onChange={(e) => setThemeId(e.target.value)}
  >
    <option value="">Select theme</option>
    {themes.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ))}
  </select>
</div>

        </>
      )}

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
