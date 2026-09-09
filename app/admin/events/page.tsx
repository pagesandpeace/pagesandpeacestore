import Link from "next/link";
import { redirect } from "next/navigation";

import Pagination from "@/components/admin/Pagination";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { appCoreDb } from "@/lib/app-core/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events");

  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const db = appCoreDb();
  const { count, error: countError } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .neq("status", "archived");
  if (countError) throw new Error("Unable to count events");

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: events, error } = await db
    .from("events")
    .select("id, title, slug, starts_at, status, capacity, created_at, series_name")
    .neq("status", "archived")
    .order("starts_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error("Unable to load events");

  const eventIds = (events ?? []).map((event) => event.id);
  const { data: bookings } = eventIds.length
    ? await db
        .from("bookings")
        .select("event_id, quantity, status, order_line_id")
        .in("event_id", eventIds)
        .in("status", ["pending", "confirmed"])
    : { data: [] };

  const orderLineIds = (bookings ?? []).map((booking) => booking.order_line_id);
  const { data: orderLines } = orderLineIds.length
    ? await db.from("order_lines").select("id, refunded_quantity").in("id", orderLineIds)
    : { data: [] };

  const refundedByLine = new Map<string, number>();
  for (const line of orderLines ?? []) refundedByLine.set(line.id, Number(line.refunded_quantity ?? 0));

  const reservedByEvent = new Map<string, number>();
  for (const booking of bookings ?? []) {
    const reserved =
      booking.status === "pending"
        ? Number(booking.quantity)
        : Math.max(0, Number(booking.quantity) - (refundedByLine.get(booking.order_line_id) ?? 0));
    reservedByEvent.set(booking.event_id, (reservedByEvent.get(booking.event_id) ?? 0) + reserved);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-2 text-sm text-foreground/60">{count ?? 0} active and historical events.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/events/bookings" className="rounded-lg border border-black/15 px-4 py-3 font-semibold">Bookings</Link>
          <Link href="/admin/events/new" className="rounded-lg bg-black px-4 py-3 font-semibold text-white">Create event</Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-[#f8f5f1] text-foreground/70">
              <tr>
                <th className="px-5 py-4 font-medium">Event</th>
                <th className="px-5 py-4 font-medium">Group</th>
                <th className="px-5 py-4 font-medium">Starts</th>
                <th className="px-5 py-4 font-medium">Capacity</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(events ?? []).map((event) => {
                const reserved = reservedByEvent.get(event.id) ?? 0;
                const available = Math.max(event.capacity - reserved, 0);
                return (
                  <tr key={event.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-foreground/55">/{event.slug}</p>
                    </td>
                    <td className="px-5 py-4 text-foreground/70">{event.series_name || "—"}</td>
                    <td className="px-5 py-4 text-foreground/70">{formatDate(event.starts_at)}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{available} available</p>
                      <p className="text-xs text-foreground/60">{reserved} reserved · {event.capacity} total</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#f2eee8] px-2.5 py-1 text-xs font-medium capitalize">{event.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <Link href={`/admin/events/${event.id}/edit`} className="font-medium underline underline-offset-4">Edit</Link>
                        <Link href={`/admin/events/new?duplicate=${event.id}`} className="font-medium underline underline-offset-4">Duplicate</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!(events ?? []).length ? <p className="px-5 py-12 text-center text-foreground/60">No events yet.</p> : null}
        <Pagination page={safePage} totalPages={totalPages} basePath="/admin/events" />
      </div>
    </div>
  );
}
