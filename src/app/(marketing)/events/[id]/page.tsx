import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  events,
  eventBookings,
  eventCategoryLinks,
  eventCategories,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import BookNowButton from "@/components/events/BookNowButton";

export const revalidate = 30;

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await props.params;

  /* FETCH EVENT */
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

  /* FETCH CATEGORIES */
  const categoryLinks = await db
    .select()
    .from(eventCategoryLinks)
    .where(eq(eventCategoryLinks.eventId, eventId));

  const categoryIds = categoryLinks.map((c) => c.categoryId);

  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(eventCategories)
          .where(inArray(eventCategories.id, categoryIds))
      : [];

  /* FETCH BOOKINGS */
  const attendeeList = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.eventId, eventId));

  const activeBookings = attendeeList.filter((b) => !b.cancelled).length;
  const remainingSeats = event.capacity - activeBookings;
  const soldOut = remainingSeats <= 0;

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="bg-[#FAF6F1] min-h-screen pb-20">

      {/* FULL WIDTH HERO */}
      <div className="relative w-full h-[55vh] min-h-[320px]">


        <Image
          src={event.imageUrl || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover object-center"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <h1 className="absolute bottom-8 left-8 text-white text-4xl font-extrabold drop-shadow-xl tracking-tight">
          {event.title}
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-10">

        {/* SUBTITLE */}
        {event.subtitle && (
          <p className="text-xl text-neutral-700 italic text-center">
            {event.subtitle}
          </p>
        )}

        {/* SHORT DESCRIPTION */}
        {event.shortDescription && (
          <p className="text-center text-neutral-700 text-lg leading-relaxed max-w-2xl mx-auto">
            {event.shortDescription}
          </p>
        )}

        {/* CATEGORIES */}
        {categories.length > 0 && (
          <section className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 text-[#111]">Categories</h2>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 bg-[#fff7e6] text-[#c67b00] border border-[#f2e6cc] rounded-full text-xs"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* EVENT DETAILS */}
        <section className="space-y-6 text-neutral-700 text-lg">

          <div className="border-b border-neutral-300 pb-4">
            <strong className="text-[#111] block mb-1">Date & Time</strong>
            {formattedDate}
          </div>

          <div className="border-b border-neutral-300 pb-4">
            <strong className="text-[#111] block mb-1">Price</strong>
            £{(event.pricePence / 100).toFixed(2)}
          </div>

          <div className="border-b border-neutral-300 pb-4">
            <strong className="text-[#111] block mb-1">Seats Remaining</strong>
            {soldOut ? (
              <span className="text-red-600 font-semibold">Sold Out</span>
            ) : (
              <span className="text-green-700 font-semibold">{remainingSeats}</span>
            )}
          </div>

          {event.description && (
            <div className="pt-2">
              <strong className="text-[#111] block mb-2">About This Event</strong>
              <p className="leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="text-center">
          {soldOut ? (
            <button
              disabled
              className="bg-red-300 text-white px-8 py-3 rounded-lg font-semibold opacity-70 cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : (
            <BookNowButton eventId={event.id} />
          )}
        </div>

        {/* TERMS LINK — ★ NEW ★ */}
        <div className="text-center mt-4">
          <Link
            href="/dashboard/legal/event-booking-terms"
            className="text-[var(--accent)] underline text-sm hover:opacity-80"
          >
            Booking Terms & Conditions
          </Link>
        </div>

      </div>
    </main>
  );
}
