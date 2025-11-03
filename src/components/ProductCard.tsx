"use client";

import Image from "next/image";
import Link from "next/link";

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  imageUrl?: string | null;
  author?: string | null;
  description?: string | null;
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white border border-[#e0dcd6] rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <Link href={`/product/${product.slug}`}>
        <div className="relative w-full h-64">
          <Image
            src={product.imageUrl || "/book_placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-[#111]">{product.name}</h3>
          {product.author && (
            <p className="text-sm text-[#111]/70">by {product.author}</p>
          )}
          <p className="text-[#5DA865] font-medium">
            £{Number(product.price).toFixed(2)}
          </p>
        </div>
      </Link>
    </div>
  );
}
