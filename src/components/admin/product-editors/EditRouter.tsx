"use client";

import { useEffect, useState } from "react";
import EditBlindDatePage from "./EditBlindDate";
import EditBookPage from "./EditBook";
import EditCoffeePage from "./EditCoffee";
import EditMerchPage from "./EditMerch";
import EditGeneralPage from "./EditGeneral";

/* -------------------------------------------------------
   METADATA TYPES
------------------------------------------------------- */
interface BlindDateMetadata {
  theme: string;
  colour: string;
  vibe: string;
  items: string[];
}

interface BookMetadata {
  isbn: string;
}

interface CoffeeMetadata {
  roast: string;
  origin: string;
  weight: string;
  grind: string;
  tasting_notes: string;
}

interface MerchMetadata {
  size: string;
  material: string;
  colour: string;
}

type GeneralMetadata = Record<string, string | number | boolean | null>;

/* -------------------------------------------------------
   RAW PRODUCT
------------------------------------------------------- */
interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  product_type: string;
  inventory_count: number;
  metadata?: unknown | null;
  genre_id?: string | null;
  author?: string | null;
  format?: string | null;
  language?: string | null;
  is_subscription?: boolean;
}

/* -------------------------------------------------------
   NORMALISE RAW PRODUCT
------------------------------------------------------- */
function normalise(raw: RawProduct): RawProduct {
  return {
    ...raw,
    description: raw.description ?? "",
    price: typeof raw.price === "string" ? Number(raw.price) : raw.price,
    image_url: raw.image_url ?? "",
    metadata: raw.metadata ?? {},
    author: raw.author ?? "",
    format: raw.format ?? "",
    language: raw.language ?? "",
    genre_id: raw.genre_id ?? null,
  };
}

/* -------------------------------------------------------
   TYPE GUARDS
------------------------------------------------------- */
function isBlindDateMetadata(m: unknown): m is BlindDateMetadata {
  return typeof m === "object" && m !== null;
}

function isBookMetadata(m: unknown): m is BookMetadata {
  return typeof m === "object" && m !== null;
}

function isCoffeeMetadata(m: unknown): m is CoffeeMetadata {
  return typeof m === "object" && m !== null;
}

function isMerchMetadata(m: unknown): m is MerchMetadata {
  return typeof m === "object" && m !== null;
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */
export default function EditRouter({ id }: { id: string }) {
  const [initial, setInitial] = useState<RawProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        const raw = res.ok
          ? await res.json()
          : {
              id,
              name: "",
              slug: "",
              description: "",
              price: 0,
              image_url: "",
              product_type: "general",
              inventory_count: 0,
              metadata: {},
            };
        setInitial(normalise(raw));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading || !initial) return <p>Loading…</p>;

  const p = initial;

  /* -------------------------------------------------------
      BLIND-DATE
  ------------------------------------------------------- */
  if (p.product_type === "blind-date") {
    const meta = isBlindDateMetadata(p.metadata)
      ? p.metadata
      : { theme: "", colour: "", vibe: "", items: [] };

    return (
      <EditBlindDatePage
        initial={{
          ...p,
          description: p.description ?? "",
          image_url: p.image_url ?? "",
          product_type: "blind-date",
          metadata: {
            theme: meta.theme ?? "",
            colour: meta.colour ?? "",
            vibe: meta.vibe ?? "",
            items: Array.isArray(meta.items) ? meta.items : [],
          },
        }}
      />
    );
  }

  /* -------------------------------------------------------
      BOOK
  ------------------------------------------------------- */
  if (p.product_type === "book") {
    const meta = isBookMetadata(p.metadata)
      ? p.metadata
      : { isbn: "" };

    return (
      <EditBookPage
        initial={{
          ...p,
          description: p.description ?? "",
          image_url: p.image_url ?? "",
          product_type: "book",
          author: p.author ?? "",
          format: p.format ?? "",
          language: p.language ?? "",
          genre_id: p.genre_id ?? null,
          metadata: { isbn: meta.isbn ?? "" },
        }}
      />
    );
  }

  /* -------------------------------------------------------
      COFFEE
  ------------------------------------------------------- */
  if (p.product_type === "coffee") {
    const meta = isCoffeeMetadata(p.metadata)
      ? p.metadata
      : { roast: "", origin: "", weight: "", grind: "", tasting_notes: "" };

    return (
      <EditCoffeePage
        initial={{
          ...p,
          description: p.description ?? "",
          image_url: p.image_url ?? "",
          genre_id: p.genre_id ?? null,
          product_type: "coffee",
          metadata: {
            roast: meta.roast ?? "",
            origin: meta.origin ?? "",
            weight: meta.weight ?? "",
            grind: meta.grind ?? "",
            tasting_notes: meta.tasting_notes ?? "",
          },
        }}
      />
    );
  }

  /* -------------------------------------------------------
      MERCH
  ------------------------------------------------------- */
  if (p.product_type === "merch") {
    const meta = isMerchMetadata(p.metadata)
      ? p.metadata
      : { size: "", material: "", colour: "" };

    return (
      <EditMerchPage
        initial={{
          ...p,
          description: p.description ?? "",
          image_url: p.image_url ?? "",
          product_type: "merch",
          metadata: {
            size: meta.size ?? "",
            material: meta.material ?? "",
            colour: meta.colour ?? "",
          },
        }}
      />
    );
  }

  /* -------------------------------------------------------
      DEFAULT (GENERAL)
  ------------------------------------------------------- */
  const generalMeta: GeneralMetadata =
    typeof p.metadata === "object" && p.metadata !== null
      ? (p.metadata as GeneralMetadata)
      : {};

  return (
    <EditGeneralPage
      initial={{
        ...p,
        description: p.description ?? "",
        image_url: p.image_url ?? "",
        product_type: p.product_type ?? "general",
        metadata: generalMeta,
      }}
    />
  );
}
