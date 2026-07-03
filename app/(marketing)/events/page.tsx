export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import EventCard, { EventCardType } from "@/components/events/EventCard";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  capacity: number;
  image_url: string | null;
  is_test: boolean;
  published: boolean;
  booking_type: "ticketed" | "interest";
  event_ticket_types: {
    price_pence: number;
    is_default: boolean;
  }[];
};

type BookingRow = {
  event_id: string;
};

export default async function EventsPage() {
  const supabase = await supabaseServer();
  const now = new Date();

  /* -----------------------------
     FETCH PUBLIC EVENTS ONLY
  ----------------------------- */
  const { data: events, error: eventErr } = await supabase
    .from("events")
    .select(`
      id,
      slug,
      title,
      date,
      capacity,
      image_url,
      is_test,
      published,
      booking_type,
      event_ticket_types (
        price_pence,
        is_default
      )
    `)
    .eq("is_test", false)
    .eq("published", true)
    .order("date", { ascending: true });

  if (eventErr) {
    console.error("❌ Error loading events:", eventErr);
  }

  const allEvents: EventRow[] = events ?? [];

  /* -----------------------------
     FETCH BOOKINGS FOR SEAT COUNTS
  ----------------------------- */
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: bookings, error: bookingsErr } = await supabaseAdmin
    .from("event_bookings")
    .select("event_id")
    .eq("paid", true)
    .eq("cancelled", false);

  if (bookingsErr) {
    console.error("❌ Error loading event bookings:", bookingsErr);
  }

  const allBookings: BookingRow[] = bookings ?? [];

  /* -----------------------------
     UPCOMING EVENTS ONLY
  ----------------------------- */
  const upcomingEvents = allEvents.filter(
    (evt) => new Date(evt.date) >= now
  );

  /* -----------------------------
     COMPUTE REMAINING SEATS
  ----------------------------- */
  const eventRows: EventCardType[] = upcomingEvents.map((evt) => {
    const usedSeats = allBookings.filter(
      (booking) => booking.event_id === evt.id
    ).length;

    const defaultTicket = evt.event_ticket_types?.find(
      (ticket) => ticket.is_default
    );

    return {
      id: evt.id,
      slug: evt.slug,
      title: evt.title,
      date: evt.date,
      imageUrl: evt.image_url,
      remaining: evt.capacity - usedSeats,

      defaultPricePence:
        evt.booking_type === "ticketed"
          ? defaultTicket?.price_pence ?? 0
          : null,

      bookingType: evt.booking_type,
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
            {eventRows.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}