export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";

import EventCard, { EventCardType } from "@/components/EventCard";

export default async function EventsPage() {
  // Fetch events
  const list = await db.select().from(events).orderBy(events.date);

  // Fetch all bookings
  const bookings = await db.select().from(eventBookings);

  // Build rows with remaining capacity
  const eventRows = list.map((evt) => {
    const active = bookings.filter(
      (b) => b.eventId === evt.id && !b.cancelled
    ).length;

    return {
      ...evt,
      remaining: evt.capacity - active,
    };
  });

  return (
    <div className="bg-[var(--background)] min-h-screen">
      
      {/* HERO */}
      <div className="relative py-20 text-center bg-gradient-to-b from-[var(--background)] to-[#f5efe9]">
        <h1 className="text-4xl font-extrabold text-[#111] tracking-tight">
          Events at Pages & Peace
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-600">
          Author nights, tastings, creative workshops and more.
        </p>
      </div>

      {/* GRID */}
      <div
        className="
          max-w-7xl mx-auto px-6 py-12
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10
        "
      >
        {eventRows.length === 0 && (
          <p className="text-neutral-600 text-center col-span-full">
            No events scheduled yet. Check back soon!
          </p>
        )}

        {eventRows.map((evt) => {
          const cardEvent: EventCardType = {
            id: evt.id,
            title: evt.title,
            date: evt.date,
            pricePence: evt.pricePence,
            imageUrl: evt.imageUrl,
            remaining: evt.remaining,
          };

          return <EventCard key={evt.id} event={cardEvent} />;
        })}
      </div>
    </div>
  );
}
