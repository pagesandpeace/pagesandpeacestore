import { db } from "@/lib/db";
import { products } from "@/lib/db/schema/index";
import { eq } from "drizzle-orm";
import Image from "next/image";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ✅ unpack from Promise
  const [product] = await db.select().from(products).where(eq(products.slug, slug));

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF6F1] text-[#111]">
        <p>Sorry, this book couldn’t be found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 py-12">
      <section className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
        <div className="relative w-full h-[500px]">
          <Image
            src={product.imageUrl || "/book_placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover rounded-xl border border-[#e0dcd6]"
          />
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          {product.author && (
            <p className="text-lg text-[#111]/80">by {product.author}</p>
          )}
          <p className="text-xl font-semibold text-[#5DA865]">
            £{Number(product.price).toFixed(2)}
          </p>
          {product.description && (
            <p className="text-[#111]/80 leading-relaxed">
              {product.description}
            </p>
          )}

          <form action="/api/checkout" method="POST">
            <input type="hidden" name="item" value={product.id} />
            <button
              type="submit"
              className="px-8 py-3 rounded-full bg-[#5DA865] text-[#FAF6F1] font-semibold hover:opacity-90 transition-all"
            >
              Buy Now
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
