import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const formatDate = (value: string) => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardEventsPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in?callbackURL=/dashboard/events");

  const orders = await getCustomerEventOrders(user.id);
  const now = new Date();
  const upcoming = orders.flatMap((order) => order.lines.map((line) => ({ line, orderId: order.id })))
    .filter(({ line }) => line.event && new Date(line.event.starts_at) >= now)
    .sort((a, b) => new Date(a.line.event!.starts_at).getTime() - new Date(b.line.event!.starts_at).getTime());

  return <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
    <header>
      <p className="text-sm font-medium text-foreground/60">Your account</p>
      <h1 className="mt-1 text-3xl font-bold">My events</h1>
      <p className="mt-2 text-foreground/65">Your confirmed Pages & Peace bookings.</p>
    </header>

    <section className="rounded-2xl border bg-white">
      <div className="flex items-end justify-between gap-4 border-b p-6">
        <div><h2 className="text-2xl font-bold">Upcoming events</h2><p className="mt-1 text-sm text-foreground/60">Your next confirmed bookings.</p></div>
        <Link href="/dashboard/events/past" className="text-sm font-semibold underline">Past bookings</Link>
      </div>
      {upcoming.length ? <div className="divide-y">{upcoming.map(({ line, orderId }) => <article key={line.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">{line.event!.title}</h3><p className="mt-1 text-sm text-foreground/65">{formatDate(line.event!.starts_at)}</p><p className="mt-1 text-sm text-foreground/65">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p></div>
        <div className="flex shrink-0 gap-3"><Link href={`/events/${line.event!.slug}`} className="rounded-lg border px-3 py-2 text-sm font-semibold">Event details</Link><a href={`mailto:admin@pagesandpeace.co.uk?subject=${encodeURIComponent(`Booking help — ${orderId}`)}`} className="rounded-lg border px-3 py-2 text-sm font-semibold">Booking help</a></div>
      </article>)}</div> : <div className="p-6 text-sm text-foreground/65">You have no upcoming bookings. <Link href="/events" className="underline">View upcoming events</Link>.</div>}
    </section>

    <section className="rounded-2xl border bg-[#FAF6F1] p-6 text-sm text-foreground/70"><p className="font-semibold text-foreground">Need a refund or help with a booking?</p><p className="mt-1">Use Booking help beside the relevant event and include your booking reference.</p></section>
  </main>;
}
