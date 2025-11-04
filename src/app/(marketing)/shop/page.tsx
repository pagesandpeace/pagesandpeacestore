"use client";

import { handleBuyNow } from "@/lib/checkout";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function ShopPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { addToCart } = useCart();

  // ---- Temporary demo data ----
  const genres = [
    { id: "books", name: "Books" },
    { id: "coffee", name: "Coffee" },
    { id: "memberships", name: "Memberships" },
  ];

  const products = [
    {
      id: "1",
      name: "Pages & Peace Tote Bag",
      slug: "pages-peace-tote",
      description: "Eco-friendly tote bag with our logo.",
      price: 12.99,
      image_url: "/coming_soon.svg",
      genre_id: "books",
    },
    {
      id: "2",
      name: "House Blend Coffee Beans 250g",
      slug: "house-blend-250g",
      description: "Smooth, balanced blend roasted locally.",
      price: 9.99,
      image_url: "/coming_soon.svg",
      genre_id: "coffee",
    },
    {
      id: "3",
      name: "Monthly Book Club Membership",
      slug: "book-club-membership",
      description: "Join our book club and get 1 new read every month.",
      price: 29.99,
      image_url: "/coming_soon.svg",
      genre_id: "memberships",
    },
  ];

  const filteredProducts = selectedGenre
    ? products.filter((p) => p.genre_id === selectedGenre)
    : products;

  // ---- Debug helpers ----
  const testApi = async () => {
    console.log("🧪 Testing /api/checkout manually…");
    const res = await fetch("/api/checkout", { method: "GET" });
    console.log("🧪 /api/checkout response:", res.status, await res.text());
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16">
      {/* ---- Header ---- */}
      <section className="text-center mb-12">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={100}
          height={100}
          className="mx-auto mb-4"
        />
        <h1 className="font-montserrat text-4xl font-bold text-[var(--foreground)] mb-2">
          Shop
        </h1>
        <p className="text-[color:var(--foreground)]/70">
          Explore our curated collection of books, blends, and memberships.
        </p>

        {/* quick diagnostic button */}
        <button onClick={testApi} className="btn-outline mt-4">
          🧪 Test API
        </button>
      </section>

      {/* ---- Genre Filters ---- */}
      <section className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          className={`btn-outline ${
            selectedGenre === null
              ? "bg-[var(--accent)] text-[var(--background)]"
              : ""
          }`}
          onClick={() => setSelectedGenre(null)}
        >
          All
        </button>
        {genres.map((genre) => (
          <button
            key={genre.id}
            className={`btn-outline ${
              selectedGenre === genre.id
                ? "bg-[var(--accent)] text-[var(--background)]"
                : ""
            }`}
            onClick={() => setSelectedGenre(genre.id)}
          >
            {genre.name}
          </button>
        ))}
      </section>

      {/* ---- Product Grid ---- */}
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col items-center text-center border border-[color:var(--accent)]/10"
          >
            <Image
              src={product.image_url}
              alt={product.name}
              width={300}
              height={300}
              className="rounded-xl mb-4 object-cover"
            />
            <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
              {product.name}
            </h2>
            <p className="text-[color:var(--foreground)]/70 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
            <p className="text-lg font-semibold text-[var(--accent)] mb-4">
              £{Number(product.price).toFixed(2)}
            </p>

            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 w-full">
                <Link href={`/product/${product.slug}`} className="btn-outline flex-1">
                  View Details
                </Link>
                <button
                  onClick={() => {
                    console.log("🟢 Buy Now clicked", product);
                    handleBuyNow(product);
                  }}
                  className="btn-primary flex-1"
                >
                  Buy Now
                </button>
              </div>

              <button
                onClick={() => {
                  console.log("🛒 Adding to cart", product);
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.image_url,
                    quantity: 1,
                  });
                }}
                className="btn-primary w-full"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
