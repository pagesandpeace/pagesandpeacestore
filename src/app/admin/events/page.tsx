export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export default async function AdminEventsList() {
  const user = await getCurrentUserServer();

  // Not logged in → sign in
  if (!user) {
    redirect("/sign-in");
  }

  // Logged in but not admin → dashboard
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const list = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      pricePence: events.pricePence,
      capacity: events.capacity,
      totalBookings: sql<number>`count(${eventBookings.id})`,
      paidBookings: sql<number>`sum(case when ${eventBookings.paid} = true then 1 else 0 end)`,
    })
    .from(events)
    .leftJoin(eventBookings, eq(events.id, eventBookings.eventId))
    .groupBy(events.id)
    .orderBy(asc(events.date));

  return (
    <div className="max-w-4xl mx-auto py-16">
      <h1 className="text-4xl font-bold mb-8">Admin – Events</h1>

      <div className="space-y-6">
        {list.map((event) => (
          <Link
            key={event.id}
            href={`/admin/events/${event.id}`}
            className="block border p-6 rounded-xl hover:bg-neutral-50 transition shadow-sm"
          >
            <h2 className="text-2xl font-semibold">{event.title}</h2>

            <p className="mt-2 text-neutral-700">
              {new Date(event.date).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <p className="mt-2">
              <strong>Bookings:</strong> {event.totalBookings}
              <span className="ml-3 text-green-700">
                {event.paidBookings || 0} paid
              </span>
            </p>

            <p className="mt-2">
              <strong>Capacity:</strong> {event.capacity}
            </p>

            <p className="mt-2">
              <strong>Price:</strong> £{(event.pricePence / 100).toFixed(2)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
