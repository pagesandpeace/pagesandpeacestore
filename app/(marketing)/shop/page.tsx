export const dynamic = "force-dynamic";

import { fetchProducts } from "@/lib/shop/fetchProducts";
import FilterBar from "@/components/shop/FilterBar";
import Pagination from "@/components/shop/Pagination";
import ProductGrid from "@/components/shop/ProductGrid";
import CategoryTabs from "@/components/shop/CategoryTabs";
import { supabaseService } from "@/lib/supabase/service";

export type SearchParams = {
  page?: string;
  type?: string;
  search?: string;
  genre?: string;
  author?: string;
  vibe?: string;
  theme?: string;
  inStock?: string;
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // ✅ SERVICE ROLE CLIENT (NO AUTH, NO COOKIES)
  const supabase = supabaseService();

  /* ----------------------------------------------------
     1. LOAD HERO BLOCK
  ---------------------------------------------------- */
  const { data: heroBlock, error: heroError } = await supabase
    .from("marketing_blocks")
    .select("*")
    .eq("key", "shop_hero")
    .maybeSingle();

  if (heroError) {
    console.error("❌ hero block error:", heroError);
  }

  let heroActive = false;

  if (heroBlock) {
    const now = new Date();
    const starts = heroBlock.starts_at ? new Date(heroBlock.starts_at) : null;
    const ends = heroBlock.ends_at ? new Date(heroBlock.ends_at) : null;

    heroActive =
      heroBlock.visible &&
      (!starts || starts <= now) &&
      (!ends || now <= ends);
  }

  /* -----------------------------
     GENRES
  ------------------------------ */
  const { data: genresData } = await supabase
    .from("genres")
    .select("*")
    .order("name");

  const genres = genresData ?? [];

  /* -----------------------------
     AUTHORS
  ------------------------------ */
  const { data: authorRows } = await supabase
    .from("products")
    .select("author")
    .neq("author", null)
    .neq("product_type", "event");

  const authors = [
    ...new Set((authorRows ?? []).map((a) => a.author)),
  ];

  /* -----------------------------
     VIBES
  ------------------------------ */
  const { data: vibesData } = await supabase
    .from("vibes")
    .select("*")
    .order("name");

  const vibes = vibesData ?? [];

  /* -----------------------------
     THEMES
  ------------------------------ */
  const { data: themesData } = await supabase
    .from("themes")
    .select("*")
    .order("name");

  const themes = themesData ?? [];

  /* -----------------------------
     PRODUCTS
  ------------------------------ */
  const { products, total, page, pageSize } =
    await fetchProducts(params);

  /* -----------------------------
     CATEGORY TABS
  ------------------------------ */
  const CATEGORIES = [
    { key: "all", label: "All" },
    { key: "book", label: "Books" },
    { key: "blind-date", label: "Blind Date Books" },
    { key: "coffee", label: "Coffee" },
    { key: "merch", label: "Merch" },
    { key: "physical", label: "Gifts" },
  ];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      {heroActive && (
        <div className="relative w-full h-[260px] md:h-[340px] rounded-xl overflow-hidden shadow-lg mb-10 max-w-5xl mx-auto">
          {heroBlock?.image_url && (
            <img
              src={heroBlock.image_url}
              alt={heroBlock.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-black/40 flex flex-col justify-center px-8 py-6">
            <h2 className="text-white text-3xl md:text-5xl font-bold mb-2">
              {heroBlock?.title}
            </h2>

            <p className="text-white/90 text-lg md:text-xl max-w-2xl mb-4">
              {heroBlock?.subtitle}
            </p>

            {heroBlock?.cta_text && (
              <a
                href={heroBlock.cta_link}
                className="inline-block bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-neutral-200 transition"
              >
                {heroBlock.cta_text}
              </a>
            )}
          </div>
        </div>
      )}

      <h1 className="text-4xl font-semibold mb-6">
        Shop Pages & Peace
      </h1>

      <div className="max-w-5xl mx-auto mb-8">
        <CategoryTabs categories={CATEGORIES} />
      </div>

      <FilterBar
        genres={genres}
        authors={authors}
        vibes={vibes}
        themes={themes}
      />

      <ProductGrid products={products} />

      <Pagination total={total} page={page} pageSize={pageSize} />
    </main>
  );
}
