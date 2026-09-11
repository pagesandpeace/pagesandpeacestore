import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EventAttendanceTable from "@/components/admin/events/EventAttendanceTable";
import { getEventAttendance } from "@/lib/app-core/event-attendance";
import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { formatLondonDateTime } from "@/lib/time/london";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events");
  const { id } = await params;
  const db = appCoreDb();
  const { data: event, error } = await db.from("events").select("id, title, starts_at, capacity, status").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load event");
  if (!event) notFound();

  const { rows, summary } = await getEventAttendance(event.id);
  const spacesRemaining = Math.max(0, Number(event.capacity) - summary.attendees);

  return <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/admin/events" className="text-sm font-medium text-foreground/60 hover:text-foreground">← Events</Link><h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1><p className="mt-2 text-foreground/65">{formatLondonDateTime(event.starts_at, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div><Link href={`/admin/events/${event.id}/edit`} className="rounded-lg border border-black/15 px-4 py-3 font-semibold">Edit event</Link></div>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-foreground/60">Attending</p><p className="mt-1 text-2xl font-semibold">{summary.attendees}</p></div><div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-foreground/60">Active bookings</p><p className="mt-1 text-2xl font-semibold">{summary.bookings}</p></div><div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-foreground/60">Spaces remaining</p><p className="mt-1 text-2xl font-semibold">{spacesRemaining}</p></div></section>
    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Attendance</h2><p className="mt-1 text-sm text-foreground/60">Fully refunded tickets are excluded; partial refunds show only the remaining active quantity.</p></div><EventAttendanceTable rows={rows} /></section>
  </div>;
}
