export const dynamic = "force-dynamic";

import { getCurrentUserServer } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { eventBookings, events, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

/* --------------------------------------------------
   DASHBOARD EVENTS PAGE
-------------------------------------------------- */

export const metadata = {
  title: "My Events | Pages & Peace",
  description: "View and manage your booked events.",
  robots: { index: false, follow: false },
};

export default async function DashboardEventsPage() {
  const user = await getCurrentUserServer();
  if (!user) redirect("/sign-in?callbackURL=/dashboard/my-events")

  // Fetch all bookings for this user
  const bookings = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.userId, user.id));

  if (bookings.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] text-[#111] px-6 py-12">
        <section className="mx-auto max-w-3xl text-center space-y-6">
          <h1 className="text-3xl font-semibold tracking-widest">My Event Bookings 📚</h1>
          <p className="text-[#111]/70">You haven’t booked any events yet.</p>

          <Link
            href="/events"
            className="inline-block mt-4 rounded-lg bg-[#5DA865] px-4 py-2 text-white font-medium hover:bg-[#4e9459] transition"
          >
            Browse Events
          </Link>
        </section>
      </main>
    );
  }

  // Build list of event details (one query, not N queries)
  const eventIds = bookings.map((b) => b.eventId);
  const eventRows = await db.select().from(events);

  // Build order lookup (to fetch receipt + payment details)
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id));

  const orderMap = Object.fromEntries(orderRows.map((o) => [o.id, o]));

  // Join booking → event + order
  const bookingData = bookings.map((b) => {
    const event = eventRows.find((e) => e.id === b.eventId);
    const order = orderRows.find((o) => o.id === b.id || o.stripeCheckoutSessionId === b.id);

    return {
      booking: b,
      event,
      order,
    };
  });

  const now = new Date();

  const upcoming = bookingData.filter(
    (b) => b.event && new Date(b.event.date) >= now
  );

  const past = bookingData.filter(
    (b) => b.event && new Date(b.event.date) < now
  );

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-12 md:py-16">
      <section className="mx-auto max-w-5xl space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-2 border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">My Event Bookings 🎟️</h1>
          <p className="text-[#111]/70 text-sm">
            View your upcoming and past event bookings.
          </p>
        </header>

        {/* UPCOMING */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-wide">Upcoming Events</h2>

          {upcoming.length === 0 && (
            <p className="text-[#111]/60 text-sm">No upcoming events.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcoming.map(({ booking, event, order }) => (
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

                {/* RECEIPT */}
                {order?.stripeReceiptUrl && (
                  <a
                    href={order.stripeReceiptUrl}
                    target="_blank"
                    className="mt-3 inline-block underline text-[var(--accent)] text-sm"
                  >
                    View Receipt
                  </a>
                )}

                {/* CANCEL BUTTON (functionality not yet built) */}
                <button
                  className="mt-4 w-full rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 transition"
                  disabled={booking.cancelled}
                >
                  {booking.cancelled ? "Cancelled" : "Cancel Booking"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PAST */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-wide">Past Events</h2>

          {past.length === 0 && (
            <p className="text-[#111]/60 text-sm">No past events.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {past.map(({ booking, event, order }) => (
              <div
                key={booking.id}
                className="bg-white border border-[#e0dcd6] rounded-xl p-6 shadow-sm opacity-75"
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

                {order?.stripeReceiptUrl && (
                  <a
                    href={order.stripeReceiptUrl}
                    target="_blank"
                    className="mt-3 inline-block underline text-[var(--accent)] text-sm"
                  >
                    View Receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
