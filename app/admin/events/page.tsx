import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Copy, FileClock, Pencil } from "lucide-react";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { appCoreDb } from "@/lib/app-core/service";
import { formatLondonDateTime } from "@/lib/time/london";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return formatLondonDateTime(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  const published = status === "published";
  const label = published ? "Published" : status === "draft" ? "Draft" : status;
  return <span title={label} aria-label={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${published ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
    {published ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <FileClock className="h-4 w-4" aria-hidden="true" />}
  </span>;
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events");

  const view = (await searchParams).view === "past" ? "past" : "upcoming";
  const now = new Date().toISOString();
  const db = appCoreDb();
  let query = db.from("events").select("id, title, slug, starts_at, status, capacity, series_name").neq("status", "archived");
  query = view === "upcoming" ? query.gte("starts_at", now).order("starts_at", { ascending: true }) : query.lt("starts_at", now).order("starts_at", { ascending: false });
  const { data: events, error } = await query;
  if (error) throw new Error("Unable to load events");

  const eventIds = (events ?? []).map((event) => event.id);
  const { data: bookings, error: bookingsError } = eventIds.length ? await db.from("bookings").select("event_id, quantity, status, order_line_id").in("event_id", eventIds).in("status", ["pending", "confirmed"]) : { data: [], error: null };
  if (bookingsError) throw new Error("Unable to load event capacity");
  const orderLineIds = (bookings ?? []).map((booking) => booking.order_line_id);
  const { data: orderLines, error: linesError } = orderLineIds.length ? await db.from("order_lines").select("id, refunded_quantity").in("id", orderLineIds) : { data: [], error: null };
  if (linesError) throw new Error("Unable to load event refunds");

  const refundedByLine = new Map<string, number>();
  for (const line of orderLines ?? []) refundedByLine.set(line.id, Number(line.refunded_quantity ?? 0));
  const reservedByEvent = new Map<string, number>();
  for (const booking of bookings ?? []) {
    const reserved = booking.status === "pending" ? Number(booking.quantity) : Math.max(0, Number(booking.quantity) - (refundedByLine.get(booking.order_line_id) ?? 0));
    reservedByEvent.set(booking.event_id, (reservedByEvent.get(booking.event_id) ?? 0) + reserved);
  }

  const title = view === "upcoming" ? "Upcoming events" : "Past events";
  const subtitle = view === "upcoming" ? "Soonest event first. Open an event to view its live attendance list." : "Most recently completed event first. Attendance remains available for every event.";

  return <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-foreground/60">{subtitle}</p></div><div className="flex flex-wrap gap-3"><Link href={`/admin/events${view === "past" ? "" : "?view=past"}`} className="rounded-lg border border-black/15 px-4 py-3 font-semibold">{view === "past" ? "Upcoming events" : "Past events"}</Link><Link href="/admin/events/series" className="rounded-lg border border-black/15 px-4 py-3 font-semibold">Series templates</Link><Link href="/admin/events/bookings" className="rounded-lg border border-black/15 px-4 py-3 font-semibold">Bookings</Link><Link href="/admin/events/new" className="rounded-lg bg-black px-4 py-3 font-semibold text-white">Create event</Link></div></div>
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-[#f8f5f1] text-foreground/70"><tr><th className="px-5 py-4 font-medium">Event</th><th className="px-5 py-4 font-medium">Group</th><th className="px-5 py-4 font-medium">Starts</th><th className="px-5 py-4 font-medium">Capacity</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Actions</th></tr></thead><tbody className="divide-y">{(events ?? []).map((event) => { const reserved = reservedByEvent.get(event.id) ?? 0; const available = Math.max(event.capacity - reserved, 0); return <tr key={event.id} className="transition-colors hover:bg-stone-50"><td className="px-5 py-4"><Link href={`/admin/events/${event.id}`} className="block font-medium hover:underline">{event.title}</Link><p className="mt-1 text-xs text-foreground/55">/{event.slug}</p></td><td className="px-5 py-4 text-foreground/70">{event.series_name || "—"}</td><td className="px-5 py-4 text-foreground/70">{formatDate(event.starts_at)}</td><td className="px-5 py-4"><p className="font-medium">{available} available</p><p className="text-xs text-foreground/60">{reserved} attending · {event.capacity} total</p></td><td className="px-5 py-4"><StatusIcon status={event.status} /></td><td className="px-5 py-4"><div className="flex gap-2"><Link href={`/admin/events/${event.id}/edit`} title={`Edit ${event.title}`} aria-label={`Edit ${event.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-neutral-700 transition-colors hover:border-black hover:bg-black hover:text-white"><Pencil className="h-4 w-4" aria-hidden="true" /></Link><Link href={`/admin/events/new?duplicate=${event.id}`} title={`Duplicate ${event.title}`} aria-label={`Duplicate ${event.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-neutral-700 transition-colors hover:border-black hover:bg-black hover:text-white"><Copy className="h-4 w-4" aria-hidden="true" /></Link></div></td></tr>; })}</tbody></table></div>{!(events ?? []).length ? <p className="px-5 py-12 text-center text-foreground/60">No {view === "upcoming" ? "upcoming" : "past"} events.</p> : null}</div>
  </div>;
}
