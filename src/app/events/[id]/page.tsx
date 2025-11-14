import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import BookNowButton from "@/components/events/BookNowButton";

export const revalidate = 30;

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  // ⬅️ FIX: Await params properly
  const { id: eventId } = await props.params;

  // Fetch event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events" className="text-[var(--accent)] underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  // Fetch bookings
  const attendeeList = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.eventId, eventId));

  const activeBookings = attendeeList.filter((b) => !b.cancelled).length;
  const remainingSeats = event.capacity - activeBookings;
  const soldOut = remainingSeats <= 0;

  return (
    <div className="bg-[#FAF6F1] min-h-screen pb-20">
      <div className="py-20 text-center bg-gradient-to-b from-[#FAF6F1] to-[#f1ebe4]">
        <h1 className="text-4xl font-extrabold text-[#111] tracking-tight">
          {event.title}
        </h1>

        <p className="mt-4 text-neutral-700 text-lg max-w-2xl mx-auto leading-relaxed">
          A cosy evening at Pages & Peace — where books, coffee and community come together.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-10">
        <div className="bg-white rounded-xl border border-[#e7dfd4] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-[#111]">Event Details</h2>

          <div className="space-y-4 text-lg text-neutral-700">
            <p>
              <strong className="text-[#111]">When:</strong>{" "}
              {new Date(event.date).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <p>
              <strong className="text-[#111]">Price:</strong>{" "}
              £{(event.pricePence / 100).toFixed(2)}
            </p>

            <p>
              <strong className="text-[#111]">Seats Remaining:</strong>{" "}
              {soldOut ? (
                <span className="text-red-600 font-semibold">Sold Out</span>
              ) : (
                <span className="text-green-700 font-semibold">{remainingSeats}</span>
              )}
            </p>

            {event.description && (
              <p className="mt-6 text-neutral-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            )}
          </div>
        </div>

        <div className="text-center">
          {soldOut ? (
            <button
              disabled
              className="
                bg-red-300 text-white px-8 py-3 rounded-lg
                font-semibold cursor-not-allowed opacity-70
              "
            >
              Sold Out
            </button>
          ) : (
            <BookNowButton eventId={event.id} />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/events" className="text-[var(--accent)] underline">
            ← Back to all events
          </Link>
        </div>
      </div>
    </div>
  );
}
