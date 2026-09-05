import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ page?: string }> };
const formatDate = (value: string) => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function PastBookingsPage({ searchParams }: Props) {
  const { page: pageValue } = await searchParams;
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in?callbackURL=/dashboard/events/past");

  const orders = await getCustomerEventOrders(user.id);
  const now = new Date();
  const past = orders.flatMap((order) => order.lines.map((line) => ({ line, orderId: order.id })))
    .filter(({ line }) => line.event && new Date(line.event.starts_at) < now)
    .sort((a, b) => new Date(b.line.event!.starts_at).getTime() - new Date(a.line.event!.starts_at).getTime());
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(past.length / pageSize));
  const page = Math.min(Math.max(Number(pageValue) || 1, 1), pages);
  const visible = past.slice((page - 1) * pageSize, page * pageSize);

  return <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
    <header><Link href="/dashboard/events" className="text-sm underline">← My events</Link><p className="mt-6 text-sm font-medium text-foreground/60">Your account</p><h1 className="mt-1 text-3xl font-bold">Past bookings</h1><p className="mt-2 text-foreground/65">Your previous Pages & Peace events.</p></header>
    <section className="overflow-hidden rounded-2xl border bg-white">{visible.length ? <div className="divide-y">{visible.map(({ line, orderId }) => <article key={line.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{line.event!.title}</h2><p className="mt-1 text-sm text-foreground/65">{formatDate(line.event!.starts_at)}</p><p className="mt-1 text-sm text-foreground/65">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p></div><a href={`mailto:admin@pagesandpeace.co.uk?subject=${encodeURIComponent(`Booking help — ${orderId}`)}`} className="w-fit text-sm font-semibold underline">Booking help</a></article>)}</div> : <p className="p-6 text-sm text-foreground/65">You have no past event bookings.</p>}</section>
    {pages > 1 ? <nav className="flex items-center justify-center gap-4 text-sm">{page > 1 ? <Link href={`/dashboard/events/past?page=${page - 1}`} className="underline">← Previous</Link> : <span className="text-foreground/40">← Previous</span>}<span>Page {page} of {pages}</span>{page < pages ? <Link href={`/dashboard/events/past?page=${page + 1}`} className="underline">Next →</Link> : <span className="text-foreground/40">Next →</span>}</nav> : null}
  </main>;
}
