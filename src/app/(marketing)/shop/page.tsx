export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { products, marketing_blocks } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";
import ProductCard, { Product as ProductCardType } from "@/components/ProductCard";
import Image from "next/image";
import Link from "next/link";

// ------- TYPES -------
type SearchParamsType = {
  type?: string;
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsType>;
}) {
  // 🔥 FIX — MUST await searchParams
  const params = await searchParams;
  const activeType = params.type ?? "all";

  // Available categories
  const CATEGORIES = [
    { key: "all", label: "All" },
    { key: "blind-date", label: "Blind-Date Books" },
    { key: "book", label: "Books" },
    { key: "coffee", label: "Coffee" },
    { key: "merch", label: "Merch" },
    { key: "physical", label: "Gifts" },
  ];

  const TYPES = CATEGORIES.filter((c) => c.key !== "all").map((c) => c.key);

  // Fetch hero banner
  const [hero] = await db
    .select()
    .from(marketing_blocks)
    .where(eq(marketing_blocks.key, "shop_hero"))
    .limit(1);

  // Fetch filtered products
  const list =
    activeType === "all"
      ? await db
          .select()
          .from(products)
          .where(inArray(products.product_type, TYPES))
      : await db
          .select()
          .from(products)
          .where(eq(products.product_type, activeType));

  return (
    <main className="bg-background min-h-screen pb-20">
      {/* HERO */}
      {hero?.visible && (
        <section className="w-full relative h-[420px] mb-16">
          <Image
            src={hero.image_url || "/placeholder_hero.jpg"}
            alt={hero.title || "Shop hero banner"}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white px-6 max-w-2xl">
              <h1 className="text-5xl font-bold mb-4 drop-shadow">{hero.title}</h1>

              {hero.subtitle && (
                <p className="text-lg mb-6 opacity-90">{hero.subtitle}</p>
              )}

              {hero.cta_link && (
                <Link href={hero.cta_link}>
                  <button className="px-6 py-3 rounded-full bg-accent text-white text-lg shadow hover:bg-(--accent-dark) transition">
                    {hero.cta_text || "Explore →"}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TITLE */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-foreground">Shop Pages & Peace</h2>
        <p className="mt-4 text-lg text-(--foreground)/70 max-w-2xl mx-auto">
          Coffee. Books. Calm.
        </p>
      </div>

      {/* CATEGORY FILTER BAR */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div
          className="
            flex gap-3 overflow-x-auto pb-2
            scrollbar-hide
            -mx-1 px-1
          "
        >
          {CATEGORIES.map((cat) => {
            const active = activeType === cat.key;
            return (
              <Link
                key={cat.key}
                href={`/shop${cat.key === "all" ? "" : `?type=${cat.key}`}`}
                className={`
                  whitespace-nowrap px-5 py-2 rounded-full border
                  transition-all text-sm font-medium
                  shrink-0
                  ${
                    active
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-foreground border-gray-300 hover:bg-gray-100"
                  }
                `}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div
        className="
          max-w-7xl mx-auto px-6
          grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10
        "
      >
        {list.map((product) => (
          <ProductCard key={product.id} product={product as ProductCardType} />
        ))}
      </div>
    </main>
  );
}
