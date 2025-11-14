"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url?: string;
  genre_id?: string;
}

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);

  // Local seed data (fallback)
  const seedProducts: Product[] = [
    {
      id: "1",
      name: "Pages & Peace Tote Bag",
      slug: "pages-peace-tote",
      description:
        "Eco-friendly tote bag with our logo. Perfect for carrying your next read or coffee beans.",
      price: 12.99,
      image_url: "/coming_soon.svg",
    },
    {
      id: "2",
      name: "House Blend Coffee Beans 250g",
      slug: "house-blend-250g",
      description:
        "Smooth, balanced blend roasted locally. Notes of chocolate, nuts, and caramel sweetness.",
      price: 9.99,
      image_url: "/coming_soon.svg",
    },
    {
      id: "3",
      name: "Monthly Book Club Membership",
      slug: "book-club-membership",
      description:
        "Join our book club and receive one new read each month, plus early access to events.",
      price: 29.99,
      image_url: "/coming_soon.svg",
    },
  ];

  // Load correct product by slug
  useEffect(() => {
    const found = seedProducts.find((p) => p.slug === slug);
    setProduct(found || null);
  }, [slug]);

  // Product not found
  if (!product) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center text-center bg-[var(--background)] text-[var(--foreground)] px-6">
        <h2 className="text-2xl font-semibold mb-4">Product not found</h2>
        <Link href="/shop" className="btn-outline">
          ← Back to Shop
        </Link>
      </main>
    );
  }

  // Product display
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 py-16">
      <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Image */}
        <div className="flex justify-center">
          <Image
            src={product.image_url || "/coming_soon.svg"}
            alt={product.name}
            width={500}
            height={500}
            className="rounded-2xl shadow-md object-contain bg-white p-4"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col space-y-6">
          <h1 className="text-4xl font-semibold">{product.name}</h1>

          <p className="text-[color:var(--foreground)]/80 leading-relaxed">
            {product.description}
          </p>

          <p className="text-2xl font-bold text-[var(--accent)]">
            £{Number(product.price).toFixed(2)}
          </p>

          {/* 🚫 Buy Now disabled — Coming Soon Button */}
          <button
            disabled
            className="bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40 cursor-not-allowed rounded-full px-4 py-3 text-base font-semibold w-full md:w-auto"
          >
            🕒 Coming Soon
          </button>

          {/* Back to shop */}
          <Link href="/shop" className="btn-outline w-full md:w-auto text-center">
            ← Back to Shop
          </Link>
        </div>
      </section>
    </main>
  );
}
