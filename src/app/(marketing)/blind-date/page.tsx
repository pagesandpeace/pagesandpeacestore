export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import BlindDateFilterBar from "@/components/blind-date/BlindDateFilterBar";
import { ProductMetadata } from "@/types/product";

// ---- TYPES ----
type SearchParams = {
  theme?: string;
  vibe?: string;
  colour?: string;
};

type BlindDateMetadata = {
  theme?: string;
  vibe?: string;
  colour?: string;
  items?: string[];
};

export default async function BlindDateCategoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const theme = searchParams.theme ?? "";
  const vibe = searchParams.vibe ?? "";
  const colour = searchParams.colour ?? "";

  // ---- QUERY CONDITIONS ----
  const conditions = [eq(products.product_type, "blind-date")];

  if (theme) {
    conditions.push(eq(sql`${products.metadata} ->> 'theme'`, theme));
  }
  if (vibe) {
    conditions.push(eq(sql`${products.metadata} ->> 'vibe'`, vibe));
  }
  if (colour) {
    conditions.push(eq(sql`${products.metadata} ->> 'colour'`, colour));
  }

  // ---- QUERY ----
  const list = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.created_at);

  // ---- FIXED FILTER EXTRACTION (error-free with type guards) ----
  const themes: string[] = Array.from(
    new Set(
      list
        .map((p) => (p.metadata as BlindDateMetadata)?.theme)
        .filter((v): v is string => Boolean(v))
    )
  );

  const vibes: string[] = Array.from(
    new Set(
      list
        .map((p) => (p.metadata as BlindDateMetadata)?.vibe)
        .filter((v): v is string => Boolean(v))
    )
  );

  const colours: string[] = Array.from(
    new Set(
      list
        .map((p) => (p.metadata as BlindDateMetadata)?.colour)
        .filter((v): v is string => Boolean(v))
    )
  );

  return (
    <main className="bg-[var(--background)] min-h-screen pb-20">

      {/* HERO SECTION */}
      <section className="px-6 py-20 bg-[var(--card)] shadow-inner text-center">
        <h1 className="text-5xl font-bold tracking-tight">Blind-Date Books</h1>
        <p className="max-w-2xl mx-auto text-lg text-[var(--foreground)]/70 mt-4">
          Cosy surprises wrapped with care. Filter by your vibe, theme, or colour.
        </p>
      </section>

      {/* FILTER BAR */}
      <section className="max-w-5xl mx-auto mt-14 px-4">
        <BlindDateFilterBar
          themes={themes}
          vibes={vibes}
          colours={colours}
          theme={theme}
          vibe={vibe}
          colour={colour}
        />
      </section>

      {/* GRID */}
      <section className="mt-12 px-6">
        <div
          className="
            max-w-7xl mx-auto
            grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
            gap-10
          "
        >
          {list.length > 0 &&
  list.map((product) => (
    <ProductCard
      key={product.id}
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image_url: product.image_url,
        product_type: product.product_type,
        metadata: product.metadata as ProductMetadata,   // ⭐ FIX
      }}
    />
  ))}


          {list.length === 0 && (
            <p className="col-span-full text-center text-[var(--foreground)]/70">
              No blind-date books match your filters.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
