"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------
   METADATA TYPES (no any)
------------------------------------------------------ */
export interface BlindDateMetadata {
  theme?: string;
  colour?: string;
  vibe?: string;
}

export type GeneralMetadata = Record<string, string | number | boolean | null>;

export type ProductMetadata = BlindDateMetadata | GeneralMetadata | null;

/* ------------------------------------------------------
   PRODUCT TYPE
------------------------------------------------------ */
export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  image_url?: string | null;
  product_type?: string;
  metadata?: ProductMetadata;
};

/* ------------------------------------------------------
   COMPONENT
------------------------------------------------------ */
export default function ProductCard({ product }: { product: Product }) {
  const isBlindDate = product.product_type === "blind-date";

  // Narrow metadata safely
  const meta = (product.metadata ?? {}) as BlindDateMetadata;

  const theme = meta.theme ?? null;
  const colour = meta.colour ?? null;
  const vibe = meta.vibe ?? null;

  const href = isBlindDate
    ? `/blind-date/${product.slug}`
    : `/product/${product.slug}`;

  return (
    <div
      className="
        bg-white border border-(--accent)/10 rounded-2xl 
        shadow-sm hover:shadow-md transition-all duration-200 
        overflow-hidden flex flex-col w-full max-w-sm mx-auto
      "
    >
      {/* IMAGE */}
      <Link href={href} className="relative w-full h-64 block">
        <Image
          src={product.image_url || "/coming_soon.svg"}
          alt={product.name}
          fill
          className="object-cover"
        />

        {/* BLIND-DATE BADGE */}
        {isBlindDate && (
          <div className="absolute top-2 left-2 bg-(--accent)/80 backdrop-blur text-white px-3 py-1 rounded-md text-xs font-semibold">
            Blind Date Book
          </div>
        )}
      </Link>

      {/* CONTENT */}
      <div className="p-6 flex flex-col grow text-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">
          {product.name}
        </h3>

        {isBlindDate && (
          <div className="text-sm text-foreground/70 space-y-1">
            {theme && <p><strong>Theme:</strong> {theme}</p>}
            {vibe && <p><strong>Vibe:</strong> {vibe}</p>}

            {colour && (
              <div className="flex justify-center gap-2 items-center">
                <span>Colour:</span>
                <span
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: getColour(colour) }}
                />
              </div>
            )}
          </div>
        )}

        <p className="text-accent font-semibold text-lg">
          £{Number(product.price).toFixed(2)}
        </p>

        {/* CTA */}
        <Button variant="outline" size="md" className="w-full mt-4">
          <Link href={href}>View Details →</Link>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------
   COLOUR MAPPER
------------------------------------------------------ */
function getColour(name: string) {
  const map: Record<string, string> = {
    "Brown Kraft": "#c2a679",
    Cream: "#f2e6d8",
    White: "#ffffff",
    Pink: "#f4c2c2",
    Red: "#d40000",
    Navy: "#1a2a6c",
    "Forest Green": "#0b3d2e",
    "Pastel Blue": "#a7c7e7",
    "Pastel Yellow": "#fff5a2",
    Burgundy: "#800020",
    Black: "#000000",
  };
  return map[name] || "#dcdcdc";
}
