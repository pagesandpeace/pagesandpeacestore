import { db } from "@/lib/db";
import { products } from "@/lib/db/schema/index";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const items = await db.select().from(products);

  // filter for book-related genres or names (since merch will come later)
  const books = items.filter((p) =>
    ["book", "novel", "read"].some((kw) =>
      p.name.toLowerCase().includes(kw)
    )
  );

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-6xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-semibold tracking-widest">
            The Bookshop 📚
          </h1>
          <p className="text-[#111]/70 max-w-2xl mx-auto leading-relaxed">
            Explore our curated selection of stories and thoughtful reads.
            From timeless classics to new discoveries — each title is chosen
            with care by the Pages & Peace team.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {books.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
