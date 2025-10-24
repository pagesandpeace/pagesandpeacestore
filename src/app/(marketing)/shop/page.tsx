import Link from "next/link";

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-widest">
          Shop Pages & Peace 🛍️
        </h1>
        <p className="text-[#111]/80 leading-relaxed">
          Our online shop is coming soon! You’ll be able to browse books,
          curated gift boxes, and Pages & Peace merchandise designed for
          book-lovers and coffee dreamers alike.
        </p>
        <p className="text-[#111]/70">
          Until then, visit us in person to explore our latest titles, blends,
          and local artisan products.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-[#5DA865] font-medium hover:underline"
        >
          ← Back to Home
        </Link>
      </section>
    </main>
  );
}
