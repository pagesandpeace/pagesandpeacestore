"use client";

// ============================================================================
// CLIENT PRODUCT ACTIONS (Qty + Buttons)
// ============================================================================

import { useState } from "react";

import ProductBadge from "@/components/product/ProductBadge";
import PriceDisplay from "@/components/product/PriceDisplay";
import StockStatus from "@/components/product/StockStatus";
import FulfilmentInfo from "@/components/product/FulfilmentInfo";
import AddToCartButton from "@/components/product/AddToCartButton";
import BuyNowButton from "@/components/product/BuyNowButton";
import QuantitySelector from "@/components/product/QuantitySelector";

import type { InferModel } from "drizzle-orm";
import { products } from "@/lib/db/schema";

// Strong product type pulled directly from Drizzle schema
type Product = InferModel<typeof products>;

export default function ClientProductActions({
  product,
  image,
  price,
}: {
  product: Product;
  image: string;
  price: number;
}) {
  const [qty, setQty] = useState(1);

  return (
    <div className="space-y-6">
      <ProductBadge genre={product.genre_id ?? null} />

      <h1 className="text-4xl font-bold text-foreground">{product.name}</h1>

      {product.author && (
        <p className="text-lg text-foreground/70">by {product.author}</p>
      )}

      <PriceDisplay price={price} />

      <StockStatus count={product.inventory_count} />

      {product.description && (
        <p className="leading-relaxed text-foreground/80 whitespace-pre-line">
          {product.description}
        </p>
      )}

      {/* One QuantitySelector */}
      <QuantitySelector qty={qty} setQty={setQty} max={product.inventory_count} />

      {/* CTA buttons */}
      <div className="pt-4 space-y-4">
        <AddToCartButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            imageUrl: image,
            inventory_count: product.inventory_count,
          }}
          qty={qty}
        />

        <BuyNowButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            imageUrl: image,
            inventory_count: product.inventory_count,
          }}
          qty={qty}
        />
      </div>

      <FulfilmentInfo />
    </div>
  );
}
