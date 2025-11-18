// src/app/(marketing)/events/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import Link from "next/link";


export default async function EventsPage() {
  // Fetch all upcoming events
  const list = await db
    .select()
    .from(events)
    .orderBy(events.date);

  // Compute active bookings per event
  const bookings = await db
    .select()
    .from(eventBookings);

  const eventRows = list.map(evt => {
    const active = bookings.filter(
      b => b.eventId === evt.id && !b.cancelled
    ).length;

    const remaining = evt.capacity - active;

    return {
      ...evt,
      remaining,
    };
  });

  return (
    <div className="bg-[#FAF6F1] min-h-screen">

      {/* HERO SECTION */}
      <div className="relative py-20 text-center bg-gradient-to-b from-[#FAF6F1] to-[#f5efe9]">
        <h1 className="text-4xl font-extrabold text-[#111] tracking-tight">
          Events at Pages & Peace
        </h1>

        <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-600">
          Workshops, author evenings, tasting nights and more.
          <br />
          Discover what is happening in our cosy book & coffee home.
        </p>
      </div>

      {/* EVENTS GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {eventRows.length === 0 && (
          <p className="text-neutral-600 text-center col-span-full">
            No events scheduled yet. Check back soon!
          </p>
        )}

        {eventRows.map(evt => (
          <Link
            key={evt.id}
            href={`/events/${evt.id}`}
            className="
              bg-white border border-[#e7dfd4] rounded-xl 
              p-6 shadow-sm hover:shadow-md transition
              flex flex-col justify-between
            "
          >
            {/* TITLE */}
            <h2 className="text-xl font-semibold text-[#111]">
              {evt.title}
            </h2>

            {/* DATE */}
            <p className="mt-3 text-neutral-700">
              {new Date(evt.date).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {/* PRICE */}
            <p className="mt-3 font-medium text-[#2f6b3a]">
              £{(evt.pricePence / 100).toFixed(2)}
            </p>

            {/* STATUS BADGE */}
            {evt.remaining > 0 ? (
  <span className="inline-block rounded-full px-4 py-1 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300">
    Limited seats available
  </span>
) : (
  <span className="inline-block rounded-full px-4 py-1 text-sm font-medium bg-red-200 text-red-700 border border-red-300">
    Sold Out
  </span>
)}

          </Link>
        ))}
      </div>
    </div>
  );
}
