"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  image_url?: string | null;
  product_type?: string;
  inventory_count?: number;

  // Relational fields from fetchProducts()
  vibe?: { id: string; name: string } | null;
  theme?: { id: string; name: string } | null;

  // Metadata (only colour now)
  metadata?: { colour?: string | null } | null;
};

export default function ProductCard({ product }: { product: Product }) {
  const isBlindDate = product.product_type === "blind-date";
  const stock = product.inventory_count ?? 0;
  const outOfStock = stock <= 0;

  // Values from relational tables
  const vibeName = product.vibe?.name ?? null;
  const themeName = product.theme?.name ?? null;

  // Colour still comes from metadata
  const colour = product.metadata?.colour ?? null;

  // 🔥 NEW: unified detail page route
  const href = `/shop/${product.slug}`;

  return (
    <div
      className="
        bg-white border border-(--accent)/10 rounded-2xl
        shadow-sm hover:shadow-md transition-all duration-200
        overflow-hidden flex flex-col w-full max-w-sm mx-auto
        relative
      "
    >
      {/* IMAGE */}
      <div className="relative w-full h-64">
        <Link href={href} className="block w-full h-full">
          <Image
            src={product.image_url || "/coming_soon.svg"}
            alt={product.name}
            fill
            className={`object-cover ${outOfStock ? "opacity-60" : ""}`}
          />
        </Link>

        {/* Blind Date Badge */}
        {isBlindDate && (
          <div className="absolute top-2 left-2">
            <Badge color="purple">Blind Date Book</Badge>
          </div>
        )}

        {/* Out of Stock Badge */}
        {outOfStock && (
          <div className="absolute top-2 right-2">
            <Badge color="red">Out of Stock</Badge>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-6 flex flex-col grow text-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">
          {product.name}
        </h3>

        {/* BLIND DATE DETAILS */}
        {isBlindDate && (
          <div className="text-sm text-foreground/70 space-y-1">

            {themeName && (
              <p>
                <strong>Theme:</strong> {themeName}
              </p>
            )}

            {vibeName && (
              <p>
                <strong>Vibe:</strong> {vibeName}
              </p>
            )}

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

        {/* PRICE */}
        <p
          className={`text-lg font-semibold ${
            outOfStock
              ? "text-red-700 line-through opacity-70"
              : "text-accent"
          }`}
        >
          £{Number(product.price).toFixed(2)}
        </p>

        {/* CTA BUTTON */}
        <Button
          variant={outOfStock ? "outline" : "primary"}
          size="md"
          className="w-full mt-4"
          disabled={outOfStock}
        >
          <Link href={href} className="w-full block">
            {outOfStock ? "Out of Stock" : "View Details →"}
          </Link>
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
