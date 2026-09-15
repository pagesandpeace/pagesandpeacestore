import type { Metadata } from "next";
import Link from "next/link";
import MarketingSignup from "@/components/MarketingSignup";

export const metadata: Metadata = {
  title: "Visit our bookshop café in Rossington, Doncaster",
  description: "Plan a visit to Pages & Peace: an independent bookshop, café and event space at 8 Eva Building, Kings Avenue, Rossington, Doncaster.",
  alternates: { canonical: "https://pagesandpeace.co.uk/visit" },
};

const hours = [
  ["Monday–Wednesday", "9am–8pm"],
  ["Thursday–Saturday", "9am–5pm"],
  ["Sunday", "10am–4pm"],
];

export default function VisitPage() {
  return <main className="min-h-screen bg-[#f8f5f1] text-[#17221f]">
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#477460]">Visit Pages &amp; Peace</p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[.98] tracking-[-.04em] sm:text-6xl">A bookshop café in the heart of Rossington.</h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-[#40514a]">Come for a thoughtfully chosen book, a good coffee, or an evening that brings people together. You’ll find us in Rossington, Doncaster.</p>
      <div className="mt-10 flex flex-wrap gap-3"><Link href="/events" className="rounded-full bg-[#17221f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#477460]">See what’s on</Link><a href="https://www.google.com/maps/search/?api=1&query=8+Eva+Building+Kings+Avenue+Rossington+Doncaster+DN11+0PF" target="_blank" rel="noreferrer" className="rounded-full border border-[#17221f] px-6 py-3 text-sm font-semibold transition hover:bg-white">Get directions</a></div>
    </section>
    <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-16 md:grid-cols-2">
      <article className="rounded-[2rem] bg-white p-8 shadow-sm"><h2 className="font-serif text-3xl">Find us</h2><address className="mt-5 not-italic leading-7 text-[#40514a]">Pages &amp; Peace Coffee + Bookshop<br />8 Eva Building<br />Kings Avenue<br />Rossington, Doncaster<br />DN11 0PF</address><a href="tel:07395266100" className="mt-6 inline-block font-semibold underline underline-offset-4">Call 07395 266100</a><p className="mt-4"><a href="mailto:admin@pagesandpeace.co.uk" className="font-semibold underline underline-offset-4">admin@pagesandpeace.co.uk</a></p></article>
      <article className="rounded-[2rem] bg-[#f1e2d6] p-8"><h2 className="font-serif text-3xl">Opening hours</h2><dl className="mt-5 space-y-3 text-[#40514a]">{hours.map(([day, time]) => <div key={day} className="flex justify-between gap-6 border-b border-[#17221f]/10 pb-3"><dt>{day}</dt><dd className="font-semibold">{time}</dd></div>)}</dl><p className="mt-6 text-sm leading-6 text-[#40514a]">Hours can change for special events or holidays. Please check before a special trip.</p></article>
    </section>
    <section className="mx-auto max-w-5xl px-6 pb-20"><MarketingSignup /></section>
  </main>;
}
