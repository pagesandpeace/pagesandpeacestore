"use client";

import { useState } from "react";
import Image from "next/image";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "./BuyNowButton";
import QuantitySelector from "./QuantitySelector";
import PriceDisplay from "./PriceDisplay";
import StockStatus from "./StockStatus";
import ProductBadge from "./ProductBadge";
import FulfilmentInfo from "./FulfilmentInfo";

/* ------------------------------------------
   TYPES
------------------------------------------ */

type BlindDateProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;

  // inventory
  inventory_count: number;

  // images
  image_url?: string | null;
  imageUrl: string; // 👈 REQUIRED by cart / buy-now buttons

  // metadata
  genre_name?: string | null;
  vibe_name?: string | null;
  theme_name?: string | null;
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

export default function BlindDateDetail({
  product,
}: {
  product: BlindDateProduct;
}) {
  const [qty, setQty] = useState(1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Image */}
      {(product.image_url || product.imageUrl) && (
        <Image
          src={product.image_url ?? product.imageUrl}
          alt={product.name}
          width={800}
          height={800}
          className="rounded-xl mb-8 object-cover w-full"
        />
      )}

      <h1 className="text-3xl font-bold mb-3">{product.name}</h1>

      {/* Badges */}
      <div className="flex gap-3 mb-4">
        {product.genre_name && (
          <ProductBadge genre={product.genre_name} />
        )}
        {product.vibe_name && (
          <ProductBadge genre={product.vibe_name} />
        )}
        {product.theme_name && (
          <ProductBadge genre={product.theme_name} />
        )}
      </div>

      <PriceDisplay price={product.price} />

      <div className="my-4">
        <StockStatus count={product.inventory_count} />
      </div>

      <QuantitySelector
        qty={qty}
        setQty={setQty}
        max={product.inventory_count}
      />

      <div className="flex flex-col gap-3 mt-6">
        <AddToCartButton product={product} qty={qty} />
        <BuyNowButton product={product} qty={qty} />
      </div>

      <div className="mt-10">
        <FulfilmentInfo />
      </div>
    </div>
  );
}
