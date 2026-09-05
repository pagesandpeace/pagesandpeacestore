import Image from "next/image";
import Link from "next/link";

import { listPublishedEvents } from "@/lib/app-core/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function Home() {
  const events = await listPublishedEvents();

  return <main className="overflow-hidden bg-[#f8f5f1] text-[#17221f]">
    <section className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative flex flex-col justify-between px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_left,_#dcebe5,_transparent_42%),radial-gradient(circle_at_bottom_right,_#f4dfd0,_transparent_37%)]" />
        <div className="relative z-10"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#477460]">Pages &amp; Peace</p></div>
        <div className="relative z-10 max-w-xl py-14">
          <p className="mb-5 font-serif text-lg italic text-[#477460]">Coffee, books &amp; calm</p>
          <h1 className="text-balance font-serif text-5xl leading-[.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Every community needs a chapter.</h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#40514a]">A welcoming corner for good coffee, great reads and the kind of events that bring people together.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/events" className="rounded-full bg-[#17221f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#477460]">Explore events</Link>
            <Link href="/menu" className="rounded-full border border-[#17221f] px-6 py-3 text-sm font-semibold transition hover:bg-white">View the menu</Link>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-sm text-[#40514a]"><span className="h-px w-10 bg-[#477460]" />A little place for big conversations.</div>
      </div>
      <div className="relative min-h-[420px] lg:min-h-0">
        <Image src="/home-cafe.jpg" alt="The welcoming Pages & Peace café" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <p className="absolute bottom-6 left-6 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#17221f] backdrop-blur">Your neighbourhood chapter</p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#477460]">A place to linger</p><h2 className="mt-4 max-w-md font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">Find your next favourite thing.</h2></div>
        <p className="max-w-xl text-lg leading-8 text-[#52635c]">Pick up a page-turner, settle into a soft seat with something sweet, or join us after hours for a new story, a quiz or an evening with neighbours.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <article className="group overflow-hidden rounded-[2rem] bg-[#dfebe6]"><div className="relative aspect-[4/5] overflow-hidden"><Image src="/home-drink.jpg" alt="A chocolate drink made at Pages & Peace" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" /></div><div className="p-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#477460]">The café</p><h3 className="mt-3 font-serif text-3xl">Something lovely in every cup.</h3><Link href="/menu" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4">See the menu</Link></div></article>
        <article className="group overflow-hidden rounded-[2rem] bg-[#f1e2d6]"><div className="relative aspect-[4/5] overflow-hidden"><Image src="/home-book.jpg" alt="A book selected at Pages & Peace" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" /></div><div className="p-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5a3b]">The shelves</p><h3 className="mt-3 font-serif text-3xl">Stories waiting to be discovered.</h3><Link href="/about" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4">Our story</Link></div></article>
      </div>
    </section>

    <section className="border-y border-[#d8ddd6] bg-white/60">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#477460]">What’s on</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Make an evening of it.</h2></div><Link href="/events" className="text-sm font-semibold underline underline-offset-4">View all events</Link></div>
        {events.length ? <div className="mt-10 grid gap-4 lg:grid-cols-3">{events.slice(0,3).map((event) => <Link key={event.id} href={`/events/${event.slug}`} className="group rounded-2xl border border-[#d8ddd6] bg-[#f8f5f1] p-6 transition hover:-translate-y-1 hover:border-[#477460]"><p className="text-sm text-[#477460]">{eventDate(event.starts_at)}</p><h3 className="mt-3 font-serif text-2xl">{event.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#52635c]">{event.short_description || event.subtitle || "Join us at Pages & Peace."}</p><p className="mt-6 text-sm font-semibold">View event <span aria-hidden>→</span></p></Link>)}</div> : <div className="mt-10 rounded-2xl bg-[#f8f5f1] p-8 text-[#52635c]">Fresh events are being planned. Check back soon.</div>}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16"><div className="rounded-[2rem] bg-[#17221f] px-7 py-12 text-[#f8f5f1] sm:px-12 sm:py-16"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7d6c8]">Come in, stay awhile</p><div className="mt-6 flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><h2 className="max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Good things happen when people gather.</h2><p className="mt-4 max-w-xl text-[#dce8e2]">Find an event, plan your visit or create an account to keep your bookings together.</p></div><div className="flex flex-wrap gap-3"><Link href="/events" className="rounded-full bg-[#dcebe5] px-6 py-3 text-sm font-semibold text-[#17221f]">Find an event</Link><Link href="/sign-in" className="rounded-full border border-white/50 px-6 py-3 text-sm font-semibold">Sign in</Link></div></div></div></section>
  </main>;
}
