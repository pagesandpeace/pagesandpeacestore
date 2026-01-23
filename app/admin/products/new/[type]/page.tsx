"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

import DescriptionEditor from "@/components/admin/DescriptionEditor";
import ClassificationSuggestions from "@/components/admin/ClassificationSuggestions";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import AuthorSearchSelect from "@/components/admin/AuthorSearchSelect";
import SupplierLinkSection from "@/components/admin/SupplierLinkSection";

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

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */


function looksLikeISBN(value: string) {
  return /^[0-9]{10}([0-9]{3})?$/.test(value.replace(/-/g, ""));
}

async function fetchCoverFromISBN(isbn: string) {
  const clean = isbn.replace(/-/g, "");

  const res = await fetch("/api/admin/products/fetch-cover-from-isbn", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isbn: clean }),
  });

  const data = await res.json();

  if (!res.ok || !data.image_url) {
    throw new Error("No cover found");
  }

  return data.image_url as string;
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

  // supplier
  const [supplier, setSupplier] = useState("");
  const [supplierRef, setSupplierRef] = useState("");

  // pricing
  const [price, setPrice] = useState(0);
  const [rrp, setRrp] = useState<number | null>(null);

  // fulfilment
  const [fulfilmentMode, setFulfilmentMode] =
    useState<FulfilmentMode>("made_to_order");
  const [inventoryCount, setInventoryCount] = useState(0);

  // commercial
  const [commercialModel, setCommercialModel] =
    useState<CommercialModel>("wholesale");

  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<OutOfStockBehavior>("stop_selling");

  // book
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [format, setFormat] = useState("Paperback");
  const [language, setLanguage] = useState("English");

  // categories
  const [genreId, setGenreId] = useState("");
  const [vibeId, setVibeId] = useState("");
  const [themeId, setThemeId] = useState("");

  const [genres, setGenres] = useState<CategoryOption[]>([]);
  const [vibes, setVibes] = useState<CategoryOption[]>([]);
  const [themes, setThemes] = useState<CategoryOption[]>([]);

  // image
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

    const payload: Record<string, unknown> = {
      name,
      description,
      product_type: productType,
      image_url: imageUrl || null,

      
      price,
      rrp,

      fulfilment_mode: fulfilmentMode,
      commercial_model: commercialModel,
      supply_source:
        fulfilmentMode === "made_to_order" ? "supplier" : "stock",

      out_of_stock_behavior: outOfStockBehavior,
      inventory_count:
        fulfilmentMode === "physical" ? inventoryCount : 0,

      supplier,
      supplier_ref: supplierRef || null,
    };

    if (supplierRef && looksLikeISBN(supplierRef)) {
      payload.isbn_13 = supplierRef.replace(/-/g, "");
    }

    if (isBookLike) {
  payload.author_id = authorId || null;

  // ✅ ALWAYS populate author TEXT for search
  if (authorId) {
    // backend will resolve name from author_id
    payload.author = "__FROM_AUTHOR_ID__";
  } else if (authorName.trim()) {
    payload.author = authorName.trim();
  }

  payload.format = format;
  payload.language = language;

  if (genreId) payload.genre_id = genreId;
  if (vibeId) payload.vibe_id = vibeId;
  if (themeId) payload.theme_id = themeId;
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

      {/* NAME */}
      <div>
        <label className="block mb-1 text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* DESCRIPTION */}
      <DescriptionEditor
        mode="draft"
        value={description}
        onChange={setDescription}
        onError={setErrorMsg}
        context={{ name, supplierRef, format, language }}
      />

      {/* IMAGE */}
      <div className="space-y-2">
        <label className="block mb-1 text-sm font-medium">
          Product Image
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="neutral"
            disabled={!looksLikeISBN(supplierRef)}
            onClick={async () => {
              try {
                const url = await fetchCoverFromISBN(supplierRef);
                setImageUrl(url);
              } catch {
                setErrorMsg("No cover image found for this ISBN.");
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
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setUploading(true);
                setErrorMsg(null);

                const form = new FormData();
                form.append("file", file);

                const res = await fetch(
                  "/api/admin/products/upload-image",
                  {
                    method: "POST",
                    body: form,
                    credentials: "include",
                  }
                );

                const data = await res.json();

                if (!res.ok) {
                  setUploading(false);
                  setErrorMsg(
                    data.error || "Image upload failed."
                  );
                  return;
                }

                setImageUrl(data.url);
                setUploading(false);
              }}
            />
            <Button size="sm" variant="neutral">
              Upload image
            </Button>
          </label>
        </div>

        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Preview"
            width={240}
            height={240}
            className="rounded border mt-2"
          />
        )}
      </div>

      {/* SUPPLIER */}
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
        <label className="block mb-1 text-sm font-medium">
          Fulfilment
        </label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={fulfilmentMode}
          onChange={(e) =>
            setFulfilmentMode(
              e.target.value as FulfilmentMode
            )
          }
        >
          <option value="made_to_order">
            Made to order (supplier)
          </option>
          <option value="physical">
            Physical stock (shop)
          </option>
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
            setCommercialModel(
              e.target.value as CommercialModel
            )
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
            setOutOfStockBehavior(
              e.target.value as OutOfStockBehavior
            )
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
      {/* PRICING */}
<div className="space-y-4">
  <div>
    <label className="block mb-1 text-sm font-medium">
      Retail price (£)
    </label>
    <Input
      type="number"
      step="0.01"
      value={price}
      onChange={(e) => setPrice(Number(e.target.value))}
    />
  </div>

  <div>
    <label className="block mb-1 text-sm font-medium">
      RRP (£)
    </label>
    <Input
      type="number"
      step="0.01"
      value={rrp ?? ""}
      onChange={(e) =>
        setRrp(e.target.value === "" ? null : Number(e.target.value))
      }
    />
  </div>
</div>

            {/* BOOK / BLIND-DATE */}
      {isBookLike && (
        <div className="space-y-6 border-t pt-6">
          {/* AUTHOR */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Author
            </label>

            <AuthorSearchSelect
              value={authorId}
              onChange={(id) => {
                setAuthorId(id);
                if (id) setAuthorName("");
              }}
            />

            {!authorId && (
              <Input
                placeholder="Author name (manual)"
                value={authorName}
                onChange={(e) =>
                  setAuthorName(e.target.value)
                }
              />
            )}

            <p className="text-xs text-neutral-500">
              If the author does not exist yet, enter the
              name manually.
            </p>

            {!authorId && authorName.trim() && (
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
            throw new Error(data.error || "Author creation failed");
          }

          // ✅ select newly created author
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

          </div>

          {/* AI CLASSIFICATION */}
          <ClassificationSuggestions
            draft={{ name, description }}
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
              if (type === "genre") {
                setGenres((g) => [...g, option]);
                setGenreId(option.id);
              }
              if (type === "vibe") {
                setVibes((v) => [...v, option]);
                setVibeId(option.id);
              }
              if (type === "theme") {
                setThemes((t) => [...t, option]);
                setThemeId(option.id);
              }
            }}
          />

          {/* LANGUAGE */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Language
            </label>
            <Input
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value)
              }
            />
          </div>

          {/* FORMAT */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Format
            </label>
            <Input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            />
          </div>

          {/* MANUAL CLASSIFICATION (OVERRIDE) */}
          <div className="grid grid-cols-1 gap-3">
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
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex gap-4 pt-6">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Product"}
        </Button>

        <Button
          variant="neutral"
          onClick={() =>
            router.push("/admin/products/new")
          }
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
