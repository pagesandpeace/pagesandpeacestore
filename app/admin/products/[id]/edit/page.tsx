"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import AuthorSearchSelect from "@/components/admin/AuthorSearchSelect";
import SupplierLinkSection from "@/components/admin/SupplierLinkSection";
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
  price: number;
  rrp: number | null;
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
function looksLikeISBN(value: string) {
  return /^[0-9]{10}([0-9]{3})?$/.test(value.replace(/-/g, ""));
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
  const [price, setPrice] = useState<number>(0);
  const [rrp, setRrp] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  /* SUPPLIER */
  const [supplier, setSupplier] = useState("");
  const [supplierRef, setSupplierRef] = useState("");

  /* FULFILMENT */
  const [fulfilmentMode, setFulfilmentMode] =
    useState<"made_to_order" | "physical">("made_to_order");
  const [inventoryCount, setInventoryCount] = useState(0);
  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<"stop_selling" | "switch_to_made_to_order">("stop_selling");

  /* BOOK */
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
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
      setPrice(Number(data.price));
      setRrp(data.rrp ?? null);
      setImageUrl(data.image_url ?? "");

      setFulfilmentMode(data.fulfilment_mode);
      setInventoryCount(data.inventory_count);
      setOutOfStockBehavior(data.out_of_stock_behavior ?? "stop_selling");

      setSupplier(data.supplier ?? "");
      setSupplierRef(data.supplier_ref ?? "");

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
    setErrorMsg(null);

    const payload: Record<string, unknown> = {
      name,
      display_title: displayTitle || null,
      description,
      price,              // ✅ authoritative selling price
      rrp,                // ✅ optional supplier RRP reference
      image_url: imageUrl || null,

      fulfilment_mode: fulfilmentMode,
      out_of_stock_behavior: outOfStockBehavior,

      supplier,
      supplier_ref: supplierRef || null,

      inventory_count:
        fulfilmentMode === "made_to_order" ? 0 : inventoryCount,
    };

    // ISBN is supplier-independent
    if (
      supplierRef &&
      /^[0-9]{10}([0-9]{3})?$/.test(supplierRef.replace(/-/g, ""))
    ) {
      payload.isbn_13 = supplierRef.replace(/-/g, "");
    }

    if (isBook) {
  payload.author_id = authorId || null;

  // ✅ ensure text author stays in sync
  if (authorId) {
    payload.author = "__FROM_AUTHOR_ID__";
  } else if (authorName.trim()) {
    payload.author = authorName.trim();
  }

  payload.genre_id = genreId || null;
  payload.format = format || null;
  payload.language = language || null;
  payload.vibe_id = vibeId || null;
  payload.theme_id = themeId || null;
}


    const res = await fetch(
      `/api/admin/products/update/${product.id}`,
      {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      setErrorMsg("Failed to save product.");
      setSaving(false);
      return;
    }

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
        {/* TITLES */}
        <Input
          placeholder="Display title (optional)"
          value={displayTitle}
          onChange={(e) => setDisplayTitle(e.target.value)}
        />

        <Input
          placeholder="Internal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* DESCRIPTION */}
        <DescriptionEditor
          productId={product.id}
          value={description}
          onChange={setDescription}
          onError={setErrorMsg}
        />

        {/* SUPPLIER */}
        <SupplierLinkSection
          supplier={supplier}
          supplierRef={supplierRef}
          onChange={(k, v) =>
            k === "supplier" ? setSupplier(v) : setSupplierRef(v)
          }
        />

        {/* FULFILMENT */}
        <FulfilmentSettings
          fulfilmentMode={fulfilmentMode}
          onFulfilmentModeChange={setFulfilmentMode}
          inventoryCount={inventoryCount}
          onInventoryCountChange={setInventoryCount}
          outOfStockBehavior={outOfStockBehavior}
          onOutOfStockBehaviorChange={setOutOfStockBehavior}
        />

        {/* PRICING */}
        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold">Pricing</h3>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Selling price (£)
            </label>
            <Input
  type="number"
  step="0.01"
  value={price}
  onChange={(e) =>
    setPrice(e.target.value === "" ? 0 : Number(e.target.value))
  }
/>

          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Supplier RRP (£) <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <Input
              type="number"
              step="0.01"
              value={rrp ?? ""}
              onChange={(e) =>
                setRrp(e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Reference only. Selling price always uses the value above.
            </p>
          </div>
        </div>

        {/* IMAGE */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Product image</label>

          <div className="flex gap-2 items-center">
            <Button
              type="button"
              size="sm"
              variant="neutral"
              disabled={!looksLikeISBN(supplierRef)}
              onClick={async () => {
                try {
                  setErrorMsg(null);

                  await fetch(
                    `/api/admin/products/update/${product.id}`,
                    {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        isbn_13: supplierRef.replace(/-/g, ""),
                      }),
                    }
                  );

                  const res = await fetch(
                    `/api/admin/products/get/${product.id}`,
                    { credentials: "include", cache: "no-store" }
                  );

                  const updated = await res.json();
                  setImageUrl(updated.image_url ?? "");
                } catch {
                  setErrorMsg("No ISBN cover found.");
                }
              }}
            >
              Use ISBN cover
            </Button>

            <label className="inline-flex items-center">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
              />
              <Button size="sm" variant="neutral">
                Upload image
              </Button>
            </label>
          </div>

          {imageUrl && (
            <Image
              src={imageUrl}
              alt="preview"
              width={200}
              height={200}
              className="rounded border mt-2"
            />
          )}
        </div>
      </div>

      {/* BOOK METADATA */}
      {isBook && (
        <div className="space-y-5">
          {/* AUTHOR */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Author</label>

            <AuthorSearchSelect
              value={authorId}
              onChange={(id) => {
                setAuthorId(id);
                if (id) setAuthorName("");
              }}
            />

          {!authorId && (
  <>
    <Input
      placeholder="Author name (manual)"
      value={authorName}
      onChange={(e) => setAuthorName(e.target.value)}
    />

    {authorName.trim() && (
      <div className="flex items-center gap-3">
        <p className="text-xs text-neutral-600">
          This author does not exist yet.
        </p>

        <Button
          size="sm"
          variant="neutral"
          onClick={async () => {
            try {
              const res = await fetch("/api/admin/authors/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  name: authorName.trim(),
                }),
              });

              const data = await res.json();

              if (!res.ok || !data.author) {
                throw new Error(
                  data.error || "Author creation failed"
                );
              }

              setAuthorId(data.author.id);
              setAuthorName("");
            } catch (err) {
              setErrorMsg(
                err instanceof Error
                  ? err.message
                  : "Failed to create author"
              );
            }
          }}
        >
          Create author
        </Button>
      </div>
    )}
  </>
)}

          </div>

          {/* CLASSIFICATION */}
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
        </div>
      )}

      {/* STOCK HISTORY */}
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
                    className={
                      m.change > 0 ? "text-green-600" : "text-red-600"
                    }
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

      {/* ACTIONS */}
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
