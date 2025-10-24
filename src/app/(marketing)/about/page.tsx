import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-widest">
          About Pages & Peace ☕📚
        </h1>
        <p className="text-[#111]/80 leading-relaxed">
          Pages & Peace was created by two siblings who wanted to blend books,
          great coffee, and a sense of calm. Our Rossington café is designed to
          slow things down — a place where you can sip, read, and recharge.
        </p>
        <p className="text-[#111]/70">
          Every corner tells a story — from our shelves of local authors to our
          small-batch coffee blends.
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
