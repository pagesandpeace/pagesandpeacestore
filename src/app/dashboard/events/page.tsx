export const dynamic = "force-dynamic";

import { getCurrentUserServer } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { eventBookings, events, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

/* --------------------------------------------------
   DASHBOARD EVENTS PAGE
   Shows:
   1) Your bookings (Upcoming + Past)
   2) Browse upcoming events (View Event → Book)
-------------------------------------------------- */

export const metadata = {
  title: "Events | Pages & Peace",
  description: "View your event bookings and browse upcoming events.",
  robots: { index: false, follow: false },
};

export default async function DashboardEventsPage() {
  const user = await getCurrentUserServer();
  if (!user) redirect("/sign-in?callbackURL=/dashboard/events");

  /* --------------------------------------------------
     Fetch user bookings + events
  -------------------------------------------------- */
  const bookings = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.userId, user.id));

  const allEvents = await db.select().from(events);

  // Fetch only this user's orders
  const ordersRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id));

  const now = new Date();

  /* --------------------------------------------------
     CORRECT BOOKING → ORDER RELATIONSHIP
     Matches via stripeCheckoutSessionId
  -------------------------------------------------- */
  const bookingData = bookings.map((b) => {
    const event = allEvents.find((e) => e.id === b.eventId);

    const order = ordersRows.find(
      (o) => o.stripeCheckoutSessionId === b.stripeCheckoutSessionId
    );

    return { booking: b, event, order };
  });

  const upcoming = bookingData.filter(
    (b) => b.event && new Date(b.event.date) >= now
  );

  const past = bookingData.filter(
    (b) => b.event && new Date(b.event.date) < now
  );

  /* --------------------------------------------------
     Remaining seats for browse events
  -------------------------------------------------- */
  const allBookings = await db.select().from(eventBookings);

  const browseEvents = allEvents.map((evt) => {
    const active = allBookings.filter(
      (b) => b.eventId === evt.id && !b.cancelled
    ).length;

    const remaining = evt.capacity - active;

    return { ...evt, remaining, soldOut: remaining <= 0 };
  });

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-12 md:py-16">
      <section className="mx-auto max-w-5xl space-y-10">

        {/* HEADER */}
        <header className="flex flex-col gap-2 border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">
            Events 🎟️
          </h1>
          <p className="text-[#111]/70 text-sm">
            View your event bookings and browse upcoming events.
          </p>
        </header>

        {/* ============================================================
             SECTION 1 — MY BOOKINGS
        ============================================================ */}
        <div className="space-y-10">
          <h2 className="text-2xl font-semibold tracking-wide">My Bookings</h2>

          {/* UPCOMING */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Upcoming</h3>

            {upcoming.length === 0 ? (
              <p className="text-[#111]/60 text-sm">You have no upcoming events.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#dcd6cf] bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[#f4f0ea] text-left text-xs uppercase tracking-wide text-[#555]">
                    <tr>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Receipt</th>
                      <th className="px-4 py-3 w-32">View</th>
                    </tr>
                  </thead>

                  <tbody>
                    {upcoming.map(({ booking, event, order }) => (
                      <tr
                        key={booking.id}
                        className="border-t border-[#e7dfd4] hover:bg-[#faf8f5] transition"
                      >
                        <td className="px-4 py-4 font-medium text-[#111]">
                          {event?.title}
                        </td>

                        <td className="px-4 py-4 text-[#444]">
                          {new Date(event!.date).toLocaleString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="px-4 py-4 font-semibold text-[#2f6b3a]">
                          £{(event!.pricePence / 100).toFixed(2)}
                        </td>

                        <td className="px-4 py-4">
                          {order?.stripeReceiptUrl ? (
                            <a
                              href={order.stripeReceiptUrl}
                              target="_blank"
                              className="text-[var(--accent)] underline hover:opacity-80"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:opacity-90"
                          >
                            View
                          </Link>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PAST BOOKINGS */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Past</h3>

            {past.length === 0 && (
              <p className="text-[#111]/60 text-sm">No past events.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
              {past.map(({ booking, event }) => (
                <div
                  key={booking.id}
                  className="bg-white border border-[#e0dcd6] rounded-xl p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">{event?.title}</h3>

                  <p className="mt-2 text-sm text-neutral-700">
                    {new Date(event!.date).toLocaleString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="mt-3 font-medium text-[#2f6b3a]">
                    £{(event!.pricePence / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
             SECTION 2 — BROWSE EVENTS
        ============================================================ */}
        <div className="space-y-6 pt-10 border-t border-[#dcd6cf]">
          <h2 className="text-2xl font-semibold tracking-wide">Browse Events</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {browseEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm hover:shadow-md transition"
              >
                <h3 className="text-xl font-semibold">{evt.title}</h3>

                <p className="mt-2 text-neutral-700">
                  {new Date(evt.date).toLocaleString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <p className="mt-3 font-medium text-[#2f6b3a]">
                  £{(evt.pricePence / 100).toFixed(2)}
                </p>

                <div className="mt-3">
  {evt.soldOut ? (
    <span className="inline-block rounded-full px-4 py-1 text-sm font-medium bg-red-200 text-red-700 border border-red-300">
      Sold Out
    </span>
  ) : (
    <span className="inline-block rounded-full px-4 py-1 text-sm font-medium bg-[#E5F7E4] text-[#2f6b3a] border border-[#5DA865]/30">
      {evt.remaining} seats left
    </span>
  )}
</div>


                <div className="mt-4">
                  <Link
                    href={`/dashboard/events/${evt.id}`}
                    className="block w-full text-center px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90"
                  >
                    View Event
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </main>
  );
}
