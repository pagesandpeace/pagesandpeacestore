export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

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
  slug: string; // ✅ REQUIRED FOR LINKS
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
  past?: string;
};

export default async function DashboardEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

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

  /* -----------------------------
     FETCH DATA
  ----------------------------- */
  const { data: seats } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("user_id_uuid", user.id)
    .eq("cancelled", false);

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_test", false);

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id_uuid", user.id);

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: interests } = await admin
    .from("event_interest")
    .select("*")
    .eq("user_id", user.id);

  const { data: attendance } = await admin
    .from("event_attendance")
    .select("*")
    .eq("user_id", user.id);

      /* -----------------------------
     MAP EVENTS
  ----------------------------- */
  const interestedEvents = (interests || [])
    .map((i) => events?.find((e) => e.id === i.event_id))
    .filter((e): e is EventRecord => !!e);

  const attendingEvents = (attendance || [])
    .map((a) => events?.find((e) => e.id === a.event_id))
    .filter((e): e is EventRecord => !!e);

  /* -----------------------------
     GROUP BOOKINGS
  ----------------------------- */
  const bookingsBySession = new Map<string, BookingGroup>();

  for (const seat of seats || []) {
    const sessionId = seat.stripe_checkout_session_id;

    if (!bookingsBySession.has(sessionId)) {
      const event = events?.find((e) => e.id === seat.event_id);
      const order = orders?.find(
        (o) => o.stripe_checkout_session_id === sessionId
      );

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
     REMOVE DUPLICATES
  ----------------------------- */
  const bookedEventIds = new Set(
    bookings.map((b) => b.event.id)
  );

  const cleanInterestedEvents = interestedEvents.filter(
    (e) => !bookedEventIds.has(e.id)
  );

  const cleanAttendingEvents = attendingEvents.filter(
    (e) => !bookedEventIds.has(e.id)
  );

  const upcomingInterested = cleanInterestedEvents.filter(
    (e) => new Date(e.date) >= now
  );

  const upcomingAttending = cleanAttendingEvents.filter(
    (e) => new Date(e.date) >= now
  );

  /* -----------------------------
     BOOKINGS SPLIT
  ----------------------------- */
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.event.date) >= now
  );

  const pastBookings = bookings.filter(
    (b) => new Date(b.event.date) < now
  );

  /* -----------------------------
     BROWSE EVENTS
  ----------------------------- */
  const { data: allSeats } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("cancelled", false);

  const upcomingEvents = (events || []).filter(
    (evt) => new Date(evt.date) >= now
  );

  const browseEvents: BrowseEvent[] = upcomingEvents.map((evt) => {
    const active = (allSeats || []).filter(
      (b) => b.event_id === evt.id
    ).length;

    const remaining = evt.capacity - active;

    return {
      ...evt,
      remaining,
      soldOut: remaining <= 0,
    };
  });

    return (
  <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
    <section className="mx-auto max-w-5xl space-y-12">

      {/* HEADER */}
      <header className="border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-widest">
          Events 🎟️
        </h1>
        <p className="text-sm text-neutral-600">
          Your bookings, past events, and what&apos;s coming up next.
        </p>
      </header>

      {/* NEXT EVENT */}
      {upcomingBookings.length > 0 && (() => {
        const { event, order } = upcomingBookings[0];
        const date = new Date(event.date);

        return (
          <Link href={`/dashboard/bookings/${order.id}`}>
            <div className="rounded-xl bg-white border shadow overflow-hidden cursor-pointer hover:shadow-md">
              <div className="relative h-56">
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-semibold">
                  {event.title}
                </h3>
              </div>
            </div>
          </Link>
        );
      })()}

      {/* UPCOMING BOOKINGS */}
      {upcomingBookings.length > 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">
            Upcoming Bookings
          </h2>

          {upcomingBookings.slice(1).map(({ event, order }) => (
            <Link key={order.id} href={`/dashboard/bookings/${order.id}`}>
              <div className="flex gap-4 bg-white border rounded-xl p-4 shadow cursor-pointer hover:shadow-md">
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  width={96}
                  height={96}
                  className="rounded-lg object-cover"
                />

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {event.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 🔥 ATTENDING */}
      {upcomingAttending.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">You&#39;re Attending</h2>

          {upcomingAttending.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <div className="flex gap-4 bg-white border rounded-xl p-4 shadow cursor-pointer hover:shadow-md">
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  width={96}
                  height={96}
                  className="rounded-lg object-cover"
                />

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {event.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 🔥 INTERESTED (UNCHANGED) */}
      {upcomingInterested.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">
            You&#39;re Interested In
          </h2>

          {upcomingInterested.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <div className="flex gap-4 bg-white border rounded-xl p-4 shadow cursor-pointer hover:shadow-md">
                <Image
                  src={event.image_url || "/placeholder-event.jpg"}
                  alt={event.title}
                  width={96}
                  height={96}
                  className="rounded-lg object-cover"
                />

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {event.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* PAST EVENTS */}
      {pastBookings.length > 0 && (
        <div className="space-y-4 opacity-90">
          <h2 className="text-2xl font-semibold">Past Events</h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {pastBookings.map(({ event, order }) => (
              <div
                key={order.id}
                className="bg-white border rounded-xl p-5 shadow"
              >
                <h3 className="font-semibold text-lg">
                  {event.title}
                </h3>
                <p className="text-sm text-neutral-600">
                  {new Date(event.date).toLocaleString("en-GB")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BROWSE EVENTS */}
      <div className="pt-12 border-t space-y-6">
        <h2 className="text-2xl font-semibold">Browse Events</h2>

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
                  <div className="mt-3 px-4 py-2 text-center rounded-md bg-neutral-200 text-neutral-600 text-sm">
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
      </div>

    </section>
  </main>
);
}