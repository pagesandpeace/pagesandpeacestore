export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/auth-server";
import EventCard, { EventCardType } from "@/components/events/EventCard";

export default async function EventsPage() {
  const supabase = await supabaseServer();
  const now = new Date();

  /* -----------------------------
     FETCH EVENTS
  ----------------------------- */
  const { data: events, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  if (eventErr) {
    console.error("❌ Error loading events:", eventErr);
  }

  /* -----------------------------
     FETCH BOOKINGS
  ----------------------------- */
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select("event_id, cancelled");

  const allEvents = events ?? [];
  const allBookings = bookings ?? [];

  /* -----------------------------
     UPCOMING EVENTS ONLY
  ----------------------------- */
  const upcomingEvents = allEvents.filter(
    (evt) => new Date(evt.date) >= now
  );

  /* -----------------------------
     COMPUTE REMAINING SEATS
  ----------------------------- */
  const eventRows = upcomingEvents.map((evt) => {
    const active = allBookings.filter(
      (b) => b.event_id === evt.id && !b.cancelled
    ).length;

    return {
      ...evt,
      remaining: evt.capacity - active,
    };
  });

  return (
    <div className="bg-background min-h-screen">
      {/* HERO */}
      <div className="relative py-20 text-center bg-gradient-to-b from-background to-[#f5efe9]">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111]">
          Events at Pages & Peace
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-600">
          Author nights, tastings, creative workshops and more.
        </p>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {eventRows.length === 0 ? (
          <p className="text-neutral-600 text-center">
            No upcoming events scheduled.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {eventRows.map((evt) => {
              const cardEvent: EventCardType = {
                id: evt.id,
                slug: evt.slug,
                title: evt.title,
                date: evt.date,
                pricePence: evt.price_pence,
                imageUrl: evt.image_url,
                remaining: evt.remaining,
              };

              return <EventCard key={evt.id} event={cardEvent} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
