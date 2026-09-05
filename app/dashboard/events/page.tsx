import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { listPublishedEvents } from "@/lib/app-core/events";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ page?: string }> };

const formatDate = (value: string) => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardEventsPage({ searchParams }: Props) {
  const { page: pageValue } = await searchParams;
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in?callbackURL=/dashboard/events");

  const [orders, publishedEvents] = await Promise.all([getCustomerEventOrders(user.id), listPublishedEvents()]);
  const now = new Date();
  const bookedLines = orders.flatMap((order) => order.lines);
  const upcoming = bookedLines.filter((line) => line.event && new Date(line.event.starts_at) >= now).sort((a, b) => new Date(a.event!.starts_at).getTime() - new Date(b.event!.starts_at).getTime());
  const past = bookedLines.filter((line) => line.event && new Date(line.event.starts_at) < now).sort((a, b) => new Date(b.event!.starts_at).getTime() - new Date(a.event!.starts_at).getTime());

  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(publishedEvents.length / pageSize));
  const page = Math.min(Math.max(Number(pageValue) || 1, 1), pages);
  const browse = publishedEvents.slice((page - 1) * pageSize, page * pageSize);

  return <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
    <header><p className="text-sm font-medium text-foreground/60">Your account</p><h1 className="mt-1 text-3xl font-bold">My events</h1><p className="mt-2 text-foreground/65">Your confirmed bookings and upcoming Pages & Peace events.</p></header>

    <section><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">Upcoming bookings</h2><p className="mt-1 text-sm text-foreground/60">Everything you have booked is here.</p></div><Link href="/dashboard/orders" className="text-sm font-semibold underline">Payment history</Link></div>
      {upcoming.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{upcoming.map((line) => <article key={line.id} className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">{line.event!.title}</h3><p className="mt-2 text-sm text-foreground/65">{formatDate(line.event!.starts_at)}</p><p className="mt-1 text-sm text-foreground/65">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p></article>)}</div> : <p className="mt-5 rounded-xl border bg-white p-5 text-sm text-foreground/65">No upcoming bookings yet. Browse the events below.</p>}
    </section>

    <section className="border-t pt-10"><div><h2 className="text-2xl font-bold">Browse events</h2><p className="mt-1 text-sm text-foreground/60">Upcoming events currently available to book.</p></div>
      {browse.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{browse.map((event) => <article key={event.id} className="overflow-hidden rounded-2xl border bg-white">{event.image_url ? <img src={event.image_url} alt="" className="h-40 w-full object-cover" /> : <div className="h-40 bg-[#f1ede7]" />}<div className="p-5"><p className="text-sm text-foreground/60">{formatDate(event.starts_at)}</p><h3 className="mt-2 text-lg font-bold">{event.title}</h3>{event.short_description ? <p className="mt-2 line-clamp-2 text-sm text-foreground/65">{event.short_description}</p> : null}<p className="mt-3 text-sm font-medium">{event.remaining_seats} place{event.remaining_seats === 1 ? "" : "s"} remaining</p><Link href={`/events/${event.slug}`} className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">View event</Link></div></article>)}</div> : <p className="mt-5 text-sm text-foreground/65">No upcoming events are currently available.</p>}
      {pages > 1 ? <nav className="mt-6 flex items-center justify-center gap-4 text-sm">{page > 1 ? <Link href={`/dashboard/events?page=${page - 1}`} className="underline">← Previous</Link> : <span className="text-foreground/40">← Previous</span>}<span>Page {page} of {pages}</span>{page < pages ? <Link href={`/dashboard/events?page=${page + 1}`} className="underline">Next →</Link> : <span className="text-foreground/40">Next →</span>}</nav> : null}
    </section>

    {past.length ? <section className="border-t pt-10"><h2 className="text-2xl font-bold">Past bookings</h2><div className="mt-5 space-y-3">{past.map((line) => <article key={line.id} className="rounded-xl border bg-white p-4 opacity-75"><p className="font-medium">{line.event!.title}</p><p className="mt-1 text-sm text-foreground/65">{formatDate(line.event!.starts_at)} · {line.ticket?.name ?? "Ticket"} × {line.quantity}</p></article>)}</div></section> : null}
  </main>;
}