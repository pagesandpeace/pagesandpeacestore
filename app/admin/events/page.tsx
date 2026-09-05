import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { appCoreDb } from "@/lib/app-core/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function AdminEventsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events");

  const db = appCoreDb();
  const { data: events, error } = await db.from("events").select("id, title, slug, starts_at, status, capacity, created_at").neq("status", "archived").order("starts_at", { ascending: false });
  if (error) throw new Error("Unable to load events");

  const eventIds = (events ?? []).map((event) => event.id);
  const { data: bookings } = eventIds.length
    ? await db.from("bookings").select("event_id, quantity, status").in("event_id", eventIds).in("status", ["pending", "confirmed"])
    : { data: [] };

  const reservedByEvent = new Map<string, number>();
  for (const booking of bookings ?? []) reservedByEvent.set(booking.event_id, (reservedByEvent.get(booking.event_id) ?? 0) + booking.quantity);

  return <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-foreground/60">Rebuild admin</p><h1 className="text-3xl font-bold tracking-tight">Events</h1></div><div className="flex gap-3"><Link href="/admin/events/bookings" className="rounded-lg border border-black/15 px-4 py-3 font-semibold">Bookings</Link><Link href="/admin/events/new" className="rounded-lg bg-black px-4 py-3 font-semibold text-white">Create event</Link></div></div>

    <div className="overflow-hidden rounded-xl border border-black/10 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-[#f8f5f1] text-foreground/70"><tr><th className="px-5 py-4 font-medium">Event</th><th className="px-5 py-4 font-medium">Starts</th><th className="px-5 py-4 font-medium">Capacity</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Actions</th></tr></thead><tbody className="divide-y">{(events ?? []).map((event) => { const reserved = reservedByEvent.get(event.id) ?? 0; const available = Math.max(event.capacity - reserved, 0); return <tr key={event.id}><td className="px-5 py-4"><p className="font-medium">{event.title}</p><p className="mt-1 text-xs text-foreground/55">/{event.slug}</p></td><td className="px-5 py-4 text-foreground/70">{formatDate(event.starts_at)}</td><td className="px-5 py-4"><p className="font-medium">{available} available</p><p className="text-xs text-foreground/60">{reserved} reserved · {event.capacity} total</p></td><td className="px-5 py-4"><span className="rounded-full bg-[#f2eee8] px-2.5 py-1 text-xs font-medium capitalize">{event.status}</span></td><td className="px-5 py-4"><div className="flex gap-3"><Link href={`/admin/events/${event.id}/edit`} className="font-medium underline underline-offset-4">Edit</Link><Link href={`/admin/events/new?duplicate=${event.id}`} className="font-medium underline underline-offset-4">Duplicate</Link></div></td></tr>; })}</tbody></table>{!(events ?? []).length ? <p className="px-5 py-12 text-center text-foreground/60">No events yet.</p> : null}</div>
  </div>;
}
