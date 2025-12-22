export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Events | Pages & Peace",
  description: "View your event bookings and browse upcoming events.",
  robots: { index: false, follow: false },
};

/* -----------------------------
   TYPES
----------------------------- */
type EventBookingSeat = {
  id: string;
  event_id: string;
  stripe_checkout_session_id: string;
  cancelled: boolean;
};

type EventRecord = {
  id: string;
  title: string;
  subtitle?: string | null;
  date: string;
  image_url?: string | null;
  price_pence: number;
  capacity: number;
};

type OrderRecord = {
  id: string;
  stripe_checkout_session_id: string;
};

type BookingGroup = {
  event: EventRecord;
  order: OrderRecord;
  seats: EventBookingSeat[];
};

type BrowseEvent = EventRecord & {
  remaining: number;
  soldOut: boolean;
};

type SearchParams = {
  past?: string; // "all" to show full history
};

export default async function DashboardEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const showAllPast = sp?.past === "all";

  const supabase = await supabaseServer();

  /* -----------------------------
     AUTH
  ----------------------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    redirect("/sign-in?callbackURL=/dashboard/events");
  }

  const now = new Date();

  // rolling window for “Past bookings” (keeps page tidy)
  const SIX_MONTHS_AGO = new Date(now);
  SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

  /* -----------------------------
     FETCH USER SEATS
  ----------------------------- */
  const { data: seats } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("user_id", user.id)
    .eq("cancelled", false);

  /* -----------------------------
     FETCH EVENTS
  ----------------------------- */
  const { data: events } = await supabase.from("events").select("*");

  /* -----------------------------
     FETCH ORDERS
  ----------------------------- */
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id);

  /* -----------------------------
     GROUP SEATS → BOOKINGS
  ----------------------------- */
  const bookingsBySession = new Map<string, BookingGroup>();

  for (const seat of seats || []) {
    const sessionId = seat.stripe_checkout_session_id;

    if (!bookingsBySession.has(sessionId)) {
      const event = events?.find((e) => e.id === seat.event_id);
      const order = orders?.find((o) => o.stripe_checkout_session_id === sessionId);

      if (!event || !order) continue;

      bookingsBySession.set(sessionId, {
        event,
        order,
        seats: [seat],
      });
    } else {
      bookingsBySession.get(sessionId)!.seats.push(seat);
    }
  }

  const bookings = Array.from(bookingsBySession.values());

  /* -----------------------------
     SPLIT BOOKINGS BY DATE
  ----------------------------- */
  const upcomingBookings = bookings
    .filter((b) => new Date(b.event.date) >= now)
    .sort(
      (a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
    );

  const allPastBookings = bookings
    .filter((b) => new Date(b.event.date) < now)
    .sort(
      (a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime()
    );

  const recentPastBookings = allPastBookings.filter(
    (b) => new Date(b.event.date) >= SIX_MONTHS_AGO
  );

  const olderPastBookings = allPastBookings.filter(
    (b) => new Date(b.event.date) < SIX_MONTHS_AGO
  );

  const pastBookingsToShow = showAllPast ? allPastBookings : recentPastBookings;

  /* -----------------------------
     BROWSE EVENTS (UPCOMING ONLY)
     - Prevents overcrowding + avoids expired clutter
  ----------------------------- */
  const { data: allSeats } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("cancelled", false);

  const upcomingEvents = (events || [])
    .filter((evt) => new Date(evt.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const browseEvents: BrowseEvent[] = upcomingEvents.map((evt) => {
    const active = (allSeats || []).filter((b) => b.event_id === evt.id).length;
    const remaining = evt.capacity - active;

    return {
      ...evt,
      remaining,
      soldOut: remaining <= 0,
    };
  });

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <section className="mx-auto max-w-5xl space-y-12">
        {/* HEADER */}
        <header className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">Events 🎟️</h1>
          <p className="text-sm text-neutral-600">
            Your bookings, past events, and what&apos;s coming up next.
          </p>
        </header>

        {/* NEXT EVENT */}
        {upcomingBookings.length > 0 && (() => {
          const { event, order } = upcomingBookings[0];
          const date = new Date(event.date);
          const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);

          return (
            <div className="rounded-xl bg-white border shadow overflow-hidden">
              <div className="relative h-56">
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <h2 className="absolute bottom-4 left-6 text-2xl text-white font-bold">
                  Your Next Event
                </h2>
              </div>

              <div className="p-6 space-y-2">
                <h3 className="text-2xl font-semibold">{event.title}</h3>
                <p className="text-sm text-neutral-600">{event.subtitle}</p>

                <p className="font-medium">
                  {date.toLocaleString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <p className="text-sm text-green-700">
                  {diffDays <= 0 ? "Today" : `In ${diffDays} days`}
                </p>

                <Link
                  href={`/dashboard/bookings/${order.id}`}
                  className="inline-block mt-4 px-5 py-2 bg-accent text-white rounded-md"
                >
                  View Booking
                </Link>
              </div>
            </div>
          );
        })()}

        {/* UPCOMING BOOKINGS */}
        {upcomingBookings.length > 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Upcoming Bookings</h2>

            {upcomingBookings.slice(1).map(({ event, order }) => (
              <div
                key={order.id}
                className="flex gap-4 bg-white border rounded-xl p-4 shadow"
              >
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  width={96}
                  height={96}
                  className="rounded-lg object-cover"
                />

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm text-neutral-600">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </p>
                  <p className="font-medium">
                    £{(event.price_pence / 100).toFixed(2)}
                  </p>
                </div>

                <Link
                  href={`/dashboard/bookings/${order.id}`}
                  className="self-center px-4 py-2 bg-accent text-white rounded-md"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* PAST BOOKINGS */}
        {(pastBookingsToShow.length > 0 || olderPastBookings.length > 0) && (
          <div className="space-y-4 opacity-90">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Past Events</h2>
                {!showAllPast && (
                  <p className="text-sm text-neutral-600">
                    Showing the last 6 months.
                  </p>
                )}
              </div>

              {/* Toggle history view via query param */}
              {!showAllPast && olderPastBookings.length > 0 && (
                <Link
                  href="/dashboard/events?past=all"
                  className="text-sm underline text-neutral-700 hover:text-neutral-900"
                >
                  View all past bookings
                </Link>
              )}

              {showAllPast && (
                <Link
                  href="/dashboard/events"
                  className="text-sm underline text-neutral-700 hover:text-neutral-900"
                >
                  Show recent only
                </Link>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {pastBookingsToShow.map(({ event, order }) => (
                <div
                  key={order.id}
                  className="bg-white border rounded-xl p-5 shadow"
                >
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm text-neutral-600">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BROWSE EVENTS (UPCOMING ONLY) */}
        <div className="pt-12 border-t space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Browse Events</h2>
              <p className="text-sm text-neutral-600">
                Upcoming events only.
              </p>
            </div>
          </div>

          {browseEvents.length === 0 ? (
            <div className="bg-white border rounded-xl p-6 shadow text-neutral-700">
              No upcoming events right now.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {browseEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white border rounded-xl shadow overflow-hidden"
                >
                  <Image
                    src={evt.image_url || "/placeholder-event.jpg"}
                    alt={evt.title}
                    width={400}
                    height={160}
                    className="object-cover w-full h-40"
                  />

                  <div className="p-5 space-y-2">
                    <h3 className="font-semibold">{evt.title}</h3>
                    <p className="text-sm text-neutral-600">
                      {new Date(evt.date).toLocaleString("en-GB")}
                    </p>

                    {evt.soldOut ? (
                      <div className="mt-3 px-4 py-2 text-center rounded-md bg-neutral-200 text-neutral-600 text-sm cursor-not-allowed">
                        Sold out
                      </div>
                    ) : (
                      <Link
                        href={`/dashboard/events/${evt.id}`}
                        className="block mt-3 text-center px-4 py-2 bg-accent text-white rounded-md"
                      >
                        View Event
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
