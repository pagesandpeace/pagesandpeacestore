import Link from "next/link";

export default function BookClubPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-widest">
          Pages & Peace Book Club 📖
        </h1>
        <p className="text-[#111]/80 leading-relaxed">
          Our book club meets monthly to explore great reads — from timeless
          classics to new discoveries. Expect friendly discussions, coffee
          refills, and plenty of laughter.
        </p>
        <p className="text-[#111]/70">
          Members enjoy priority invites to author events, curated reading lists,
          and cozy evenings spent around good stories.
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
