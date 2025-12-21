"use client";

import { useState } from "react";
import Image from "next/image";

import PriceDisplay from "./PriceDisplay";
import StockStatus from "./StockStatus";
import QuantitySelector from "./QuantitySelector";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "./BuyNowButton";
import FulfilmentInfo from "./FulfilmentInfo";
import ProductBadge from "./ProductBadge";

/* ------------------------------------------
   TYPES
------------------------------------------ */

type ProductDetailProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number | string;
    image_url: string | null;
    description?: string | null;
    product_type: string;
    inventory_count?: number;

    // relational data
    vibe?: { id: string; name: string } | null;
    theme?: { id: string; name: string } | null;
    genre?: { id: string; name: string } | null;

    // book-only
    author?: string | null;

    // metadata
    metadata?: { colour?: string | null } | null;
  };
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

export default function ProductDetail({ product }: ProductDetailProps) {
  const [qty, setQty] = useState(1);

  const isBlindDate = product.product_type === "blind-date";
  const isBook = product.product_type === "book";
  const isBookLike = isBook || isBlindDate;

  const colour = product.metadata?.colour ?? null;
  const vibeName = product.vibe?.name ?? null;
  const themeName = product.theme?.name ?? null;
  const genreName = product.genre?.name ?? null;

  /* ------------------------------------------
     NORMALISE PRODUCT FOR CART / BUY-NOW
  ------------------------------------------ */
  const cartProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price:
      typeof product.price === "string"
        ? Number(product.price)
        : product.price,
    imageUrl: product.image_url ?? "",
    inventory_count: product.inventory_count,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* IMAGE */}
      <div className="w-full mb-6 flex justify-center">
        {product.image_url && (
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
            <Image
              src={product.image_url}
              alt={product.name}
              width={400}
              height={400}
              className="rounded-xl object-contain w-full h-auto"
              priority
            />
          </div>
        )}
      </div>

      {/* TITLE */}
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
        {product.name}
      </h1>

      {/* BOOK / BLIND-DATE BADGE */}
      {isBookLike && genreName && (
        <ProductBadge genre={genreName} />
      )}

      {/* META */}
      {isBookLike && (
        <div className="mt-4 space-y-2 text-foreground/80 text-sm">
          {/* AUTHOR — hidden for blind-date */}
          {!isBlindDate && product.author && (
            <p>
              <strong>Author:</strong> {product.author}
            </p>
          )}

          {genreName && (
            <p>
              <strong>Genre:</strong> {genreName}
            </p>
          )}

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

          {isBlindDate && colour && (
            <div className="flex items-center gap-2">
              <strong>Colour:</strong>
              <span
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: getColour(colour) }}
              />
            </div>
          )}

          {isBlindDate && (
            <p className="italic text-sm text-muted-foreground mt-2">
              A blind date with a book — details revealed after purchase.
            </p>
          )}
        </div>
      )}

      {/* DESCRIPTION */}
      {!isBlindDate && product.description && (
        <div className="mt-6 prose prose-sm sm:prose max-w-none">
          <p>{product.description}</p>
        </div>
      )}

      {/* PRICE */}
      <div className="mt-6">
        <PriceDisplay price={cartProduct.price} />
      </div>

      {/* STOCK */}
      <div className="my-4">
        <StockStatus count={product.inventory_count} />
      </div>

      {/* QTY */}
      <QuantitySelector
        qty={qty}
        setQty={setQty}
        max={product.inventory_count}
      />

      {/* ACTIONS */}
      <div className="flex flex-col gap-3 mt-6">
        <AddToCartButton product={cartProduct} qty={qty} />
        <BuyNowButton product={cartProduct} qty={qty} />
      </div>

      {/* FULFILMENT */}
      <div className="mt-12">
        <FulfilmentInfo />
      </div>
    </div>
  );
}

/* ------------------------------------------
   COLOUR MAPPER
------------------------------------------ */

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
