"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import AuthorSearchSelect from "@/components/admin/AuthorSearchSelect";
import SupplierLinkSection from "@/components/admin/SupplierLinkSection";
import PricingAssistant from "@/components/admin/PricingAssistant";
import DescriptionEditor from "@/components/admin/DescriptionEditor";
import FulfilmentSettings from "@/components/admin/FulfilmentSettings";
import ClassificationSuggestions from "@/components/admin/ClassificationSuggestions";

/* ---------------------------------------------------
   TYPES
--------------------------------------------------- */
interface Product {
  id: string;
  name: string;
  display_title: string | null;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;

  inventory_count: number;
  fulfilment_mode: "made_to_order" | "physical";
  out_of_stock_behavior: "stop_selling" | "switch_to_made_to_order";

  product_type: "book" | "merch" | string;

  author: string | null;
  author_id?: string | null;
  supplier_author?: string | null;

  format: string | null;
  language: string | null;
  genre_id: string | null;
  vibe_id: string | null;
  theme_id: string | null;

  supplier?: string | null;
  supplier_ref?: string | null;
  supplier_price?: number | null;
  markup_percent?: number | null;
}

interface MetaItem {
  id: string;
  name: string;
}

interface StockMovement {
  change: number;
  reason: string;
  created_at: string;
}

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
export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  /* GENERAL */
  const [name, setName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  /* SUPPLIER */
  const [supplier, setSupplier] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [supplierPrice, setSupplierPrice] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(30);

  /* FULFILMENT */
  const [fulfilmentMode, setFulfilmentMode] =
    useState<"made_to_order" | "physical">("made_to_order");
  const [inventoryCount, setInventoryCount] = useState(0);
  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<"stop_selling" | "switch_to_made_to_order">("stop_selling");

  /* BOOK */
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [genreId, setGenreId] = useState("");
  const [format, setFormat] = useState("");
  const [language, setLanguage] = useState("");
  const [vibeId, setVibeId] = useState("");
  const [themeId, setThemeId] = useState("");

  const [genres, setGenres] = useState<MetaItem[]>([]);
  const [vibes, setVibes] = useState<MetaItem[]>([]);
  const [themes, setThemes] = useState<MetaItem[]>([]);

  const isBook =
    product?.product_type === "book" ||
    product?.product_type === "blind-date";

  /* ---------------------------------------------------
     LOAD
  --------------------------------------------------- */
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/products/get/${id}`, {
        credentials: "include",
        cache: "no-store",
      });

      const data: Product = await res.json();
      setProduct(data);

      setName(data.name);
      setDisplayTitle(data.display_title ?? "");
      setDescription(data.description ?? "");
      setPrice(data.price);
      setImageUrl(data.image_url ?? "");

      setFulfilmentMode(data.fulfilment_mode);
      setInventoryCount(data.inventory_count);
      setOutOfStockBehavior(data.out_of_stock_behavior ?? "stop_selling");

      setSupplier(data.supplier ?? "");
      setSupplierRef(data.supplier_ref ?? "");
      setSupplierPrice(data.supplier_price ?? 0);
      setMarkupPercent(data.markup_percent ?? 30);

      if (
        data.product_type === "book" ||
        data.product_type === "blind-date"
      ) {
        setAuthorId(data.author_id ?? null);
        setGenreId(data.genre_id ?? "");
        setFormat(data.format ?? "");
        setLanguage(data.language ?? "");
        setVibeId(data.vibe_id ?? "");
        setThemeId(data.theme_id ?? "");
      }

      const metaRes = await fetch(
        "/api/admin/products/supporting-data",
        { credentials: "include" }
      );
      const meta = await metaRes.json();

      setGenres(meta.genres);
setVibes(meta.vibes);
setThemes(meta.themes);

const stockRes = await fetch(
  `/api/admin/products/${id}/stock-movements`,
  { credentials: "include", cache: "no-store" }
);

if (stockRes.ok) {
  const movements = await stockRes.json();
  setStockMovements(movements);
}

setLoading(false);

    }

    load();
  }, [id]);

  /* ---------------------------------------------------
     IMAGE UPLOAD
  --------------------------------------------------- */
  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/products/upload-image", {
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
     SAVE
  --------------------------------------------------- */
  async function saveChanges() {
    if (!product) return;

    setSaving(true);

    const payload: Record<string, unknown> = {
  name,
  display_title: displayTitle || null,
  description,
  price,
  image_url: imageUrl || null,

  fulfilment_mode: fulfilmentMode,
  out_of_stock_behavior: outOfStockBehavior,

  supplier,
  supplier_ref: supplierRef,

  // ✅ THIS IS THE MISSING LINE
  isbn_13:
    supplier === "independent" && supplierRef
      ? supplierRef
      : null,

  supplier_price: supplierPrice,
  markup_percent: markupPercent,
};


    payload.inventory_count =
  fulfilmentMode === "made_to_order" ? 0 : inventoryCount;


    if (isBook) {
      payload.author_id = authorId || null;
      payload.genre_id = genreId || null;
      payload.format = format || null;
      payload.language = language || null;
      payload.vibe_id = vibeId || null;
      payload.theme_id = themeId || null;
    }

    await fetch(`/api/admin/products/update/${product.id}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    router.push(`/admin/products/${product.id}`);
  }

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  if (loading || !product) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <p className="text-sm text-gray-500">Loading product…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-10">
      <h1 className="text-3xl font-bold">Edit Product</h1>

      {errorMsg && <Alert type="error" message={errorMsg} />}

      <div className="space-y-5">
        <Input
          value={displayTitle}
          onChange={(e) => setDisplayTitle(e.target.value)}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DescriptionEditor
          productId={product.id}
          value={description}
          onChange={setDescription}
          onError={setErrorMsg}
        />

        <SupplierLinkSection
          supplier={supplier}
          supplierRef={supplierRef}
          onChange={(k, v) =>
            k === "supplier" ? setSupplier(v) : setSupplierRef(v)
          }
        />

        <PricingAssistant
          supplierPrice={supplierPrice}
          markupPercent={markupPercent}
          price={Number(price)}
          onSupplierPriceChange={(v) => {
            setSupplierPrice(v);
            setPrice(calculateRetailPrice(v, markupPercent).toString());
          }}
          onMarkupChange={(v) => {
            setMarkupPercent(v);
            setPrice(calculateRetailPrice(supplierPrice, v).toString());
          }}
          onPriceChange={(v) => setPrice(v.toString())}
        />

        <FulfilmentSettings
          fulfilmentMode={fulfilmentMode}
          onFulfilmentModeChange={setFulfilmentMode}
          inventoryCount={inventoryCount}
          onInventoryCountChange={setInventoryCount}
          outOfStockBehavior={outOfStockBehavior}
          onOutOfStockBehaviorChange={setOutOfStockBehavior}
        />

        {imageUrl && (
          <Image src={imageUrl} alt="preview" width={200} height={200} />
        )}
        <input type="file" onChange={handleUpload} />
      </div>

      {isBook && (
        <div className="space-y-5">
          {product.supplier_author && (
            <div className="bg-yellow-50 border p-3">
              {product.supplier_author}
            </div>
          )}

          <AuthorSearchSelect value={authorId} onChange={setAuthorId} />

          <ClassificationSuggestions
  productId={product.id}
  genres={genres}
  vibes={vibes}
  themes={themes}
  genreId={genreId}
  vibeId={vibeId}
  themeId={themeId}
  onSelect={(type, id) => {
    if (type === "genre") setGenreId(id);
    if (type === "vibe") setVibeId(id);
    if (type === "theme") setThemeId(id);
  }}
  onCreated={(type, option) => {
    if (type === "genre") setGenres((g) => [...g, option]);
    if (type === "vibe") setVibes((v) => [...v, option]);
    if (type === "theme") setThemes((t) => [...t, option]);

    if (type === "genre") setGenreId(option.id);
    if (type === "vibe") setVibeId(option.id);
    if (type === "theme") setThemeId(option.id);
  }}
/>


          {/* MANUAL OVERRIDE */}
          <div className="space-y-3">
            <select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Genre</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={vibeId}
              onChange={(e) => setVibeId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Vibe</option>
              {vibes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Theme</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
<div className="border rounded p-4 bg-gray-50">
  <h2 className="font-semibold mb-3">Stock history</h2>

  {stockMovements.length === 0 ? (
    <p className="text-sm text-gray-500">No stock movements yet.</p>
  ) : (
    <ul className="space-y-2 text-sm">
      {stockMovements.map((m, idx) => (
        <li key={idx} className="flex justify-between">
          <span>
            <strong
              className={m.change > 0 ? "text-green-600" : "text-red-600"}
            >
              {m.change > 0 ? `+${m.change}` : m.change}
            </strong>{" "}
            {m.reason}
          </span>
          <span className="text-gray-400">
            {new Date(m.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  )}
</div>

      <div className="flex gap-4">
        <Button disabled={saving} onClick={saveChanges}>
          Save Changes
        </Button>
        <Button variant="neutral" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
