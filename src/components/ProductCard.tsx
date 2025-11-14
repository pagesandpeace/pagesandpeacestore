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
    <div className="bg-white border border-[var(--accent)]/10 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between w-full max-w-sm mx-auto">

      {/* Image */}
      <Link
        href={`/product/${product.slug}`}
        className="block relative w-full h-64"
      >
        <Image
          src={product.imageUrl || "/book_placeholder.jpg"}
          alt={product.name}
          fill
          className="object-cover"
        />
      </Link>

      {/* Info */}
      <div className="p-6 flex flex-col flex-grow justify-between text-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            {product.name}
          </h3>

          {product.author && (
            <p className="text-sm text-[var(--foreground)]/70 mb-1">
              by {product.author}
            </p>
          )}

          <p className="text-[var(--accent)] font-semibold text-lg">
            £{Number(product.price).toFixed(2)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/product/${product.slug}`}
            className="text-[var(--accent)] font-medium hover:text-[var(--secondary)] transition text-sm"
          >
            View Details →
          </Link>

          {/* NEW — Coming Soon button */}
          <button
            disabled
            className="bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40 cursor-not-allowed rounded-full px-4 py-2 text-sm font-semibold flex-1 max-w-[140px] mx-auto"
          >
            🕒 Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
