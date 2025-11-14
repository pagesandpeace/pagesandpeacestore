"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getCurrentUserClient } from "@/lib/auth/client";

import { handleBuyNow } from "@/lib/checkout";

type Genre = "gift" | "books" | "coffee" | "memberships";

type RegularProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  genre_id: Exclude<Genre, "gift">;
  kind: "regular";
};

type GiftVoucherProduct = {
  id: "gift-voucher";
  name: string;
  slug: "gift-vouchers";
  description: string;
  price: null;
  image_url: string;
  genre_id: "gift";
  kind: "gift";
};

type Product = RegularProduct | GiftVoucherProduct;
type User = { id: string; name?: string | null; email: string } | null;

export default function ShopPage() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [user, setUser] = useState<User>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // Load user once on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUserClient();
        if (!cancelled) setUser(u ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const genres = useMemo(
    () => [
      { id: "gift", name: "Gift Vouchers" },
      { id: "books", name: "Books" },
      { id: "coffee", name: "Coffee" },
      { id: "memberships", name: "Memberships" },
    ],
    []
  );

  const products: Product[] = useMemo(
    () => [
      {
        id: "gift-voucher",
        name: "Pages & Peace Gift Voucher",
        slug: "gift-vouchers",
        description:
          "Treat someone to books, coffee & calm. Pick an amount and we’ll email it or let you print at home.",
        price: null,
        image_url: "/gift-card.svg",
        genre_id: "gift",
        kind: "gift",
      },
      {
        id: "1",
        name: "Pages & Peace Tote Bag",
        slug: "pages-peace-tote",
        description: "Eco-friendly tote bag with our logo.",
        price: 12.99,
        image_url: "/coming_soon.svg",
        genre_id: "books",
        kind: "regular",
      },
      {
        id: "2",
        name: "House Blend Coffee Beans 250g",
        slug: "house-blend-250g",
        description: "Smooth, balanced blend roasted locally.",
        price: 9.99,
        image_url: "/coming_soon.svg",
        genre_id: "coffee",
        kind: "regular",
      },
      {
        id: "3",
        name: "Monthly Book Club Membership",
        slug: "book-club-membership",
        description: "Join our book club and get 1 new read every month.",
        price: 29.99,
        image_url: "/coming_soon.svg",
        genre_id: "memberships",
        kind: "regular",
      },
    ],
    []
  );

  const filteredProducts = useMemo(
    () =>
      selectedGenre
        ? products.filter((p) => p.genre_id === selectedGenre)
        : products,
    [products, selectedGenre]
  );

  const handleGiftVoucherClick = () => {
    if (checkingUser) return;
    if (!user) {
      router.push(
        `/sign-in?callbackURL=${encodeURIComponent("/gift-vouchers")}`
      );
      return;
    }
    router.push("/gift-vouchers");
  };

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
          Explore our curated collection of books, blends, memberships — and gift vouchers.
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
            onClick={() => setSelectedGenre(genre.id as Genre)}

          >
            {genre.name}
          </button>
        ))}
      </section>

      {/* ---- Product Grid ---- */}
      <section className="grid gap-10 sm:grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto px-4">
        {filteredProducts.map((product) => {
          const isGift = product.kind === "gift";

          return (
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

              {!isGift && (
                <p className="text-lg font-semibold text-[var(--accent)] mb-4">
                  £{Number(product.price).toFixed(2)}
                </p>
              )}

              {/* ---- Actions ---- */}
              <div className="flex flex-col gap-3 w-full">
                <Link
                  href={
                    isGift
                      ? "/gift-vouchers/details"
                      : `/product/${product.slug}`
                  }
                  className="text-[var(--accent)] font-medium hover:text-[var(--secondary)] transition text-sm"
                >
                  View Details →
                </Link>

                <div className="flex gap-2 w-full">
                  <button
  disabled
  className="bg-[var(--accent)]/20 text-[var(--accent)] 
             border border-[var(--accent)]/40 cursor-not-allowed 
             rounded-full px-3 py-2 text-xs font-semibold flex-1"
>
  🕒 Coming Soon
</button>


                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
