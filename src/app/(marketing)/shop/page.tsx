"use client";

import { handleBuyNow } from "@/lib/checkout";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function ShopPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { addToCart } = useCart();

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

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16 font-[Montserrat]">
      {/* ---- Header ---- */}
      <section className="text-center mb-12">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={100}
          height={100}
          className="mx-auto mb-4"
        />
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
          Shop
        </h1>
        <p className="text-[var(--foreground)]/70">
          Explore our curated collection of books, blends, and memberships.
        </p>
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
      <section className="grid gap-10 sm:grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto px-4">

        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 p-5 flex flex-col items-center text-center border border-[var(--accent)]/10"
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
            <p className="text-[var(--foreground)]/70 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
            <p className="text-lg font-semibold text-[var(--accent)] mb-4">
              £{Number(product.price).toFixed(2)}
            </p>

            {/* ---- Actions ---- */}
            <div className="flex flex-col gap-3 w-full">
              {/* View Details Link */}
              <Link
                href={`/product/${product.slug}`}
                className="text-[var(--accent)] font-medium hover:text-[var(--secondary)] transition text-sm"
              >
                View Details →
              </Link>

              {/* Buy Now + Add to Cart */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleBuyNow(product)}
                  className="border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap flex-1"
                >
                  Buy Now
                </button>

                <button
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      imageUrl: product.image_url,
                      quantity: 1,
                    })
                  }
                  className="bg-[var(--accent)] hover:bg-[var(--secondary)] text-white transition rounded-full px-3 py-1.5 text-sm font-semibold flex-1"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
