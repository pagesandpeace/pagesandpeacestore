import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          About Pages & Peace
        </h1>

        <p className="text-[#111]/80 leading-relaxed">
          Pages & Peace is an independent bookshop and café created to slow
          things down.
        </p>

        <p className="text-[#111]/70 leading-relaxed">
          Founded by two siblings, our Rossington space brings together
          thoughtfully chosen books, good coffee, and a calm place to spend
          time. Everything here is curated with care — from local authors and
          blind-date books to small-batch blends and community events.
        </p>

        <p className="text-[#111]/70 leading-relaxed">
          It’s a place to read, meet, linger, and leave feeling a little lighter.
        </p>

        <Link
          href="/"
          className="inline-block mt-8 text-[#5DA865] font-medium hover:underline"
        >
          ← Back to Home
        </Link>
      </section>
    </main>
  );
}
