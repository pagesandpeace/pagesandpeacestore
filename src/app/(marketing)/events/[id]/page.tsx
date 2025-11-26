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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;

  /* ------------------------------------------
     FETCH EVENT
  ------------------------------------------- */
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">
            Event Not Found
          </h1>
          <Link href="/events" className="text-[var(--accent)] underline">
            ← Back to Events
          </Link>
        </div>
      </main>
    );
  }

  /* ------------------------------------------
     FETCH CATEGORIES
  ------------------------------------------- */
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

  /* ------------------------------------------
     FETCH BOOKINGS
  ------------------------------------------- */
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

  /* ------------------------------------------
     PAGE OUTPUT
  ------------------------------------------- */
  return (
    <main className="bg-[var(--background)] min-h-screen pb-20 font-[Montserrat]">

      {/* HERO SECTION */}
      <div className="relative w-full h-[55vh] min-h-[320px]">
        <Image
          src={event.imageUrl || "/coming_soon.svg"}
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

      {/* MAIN CONTENT */}
      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-10">

        {/* SUBTITLE */}
        {event.subtitle && (
          <p className="text-xl text-[var(--foreground)]/80 italic text-center">
            {event.subtitle}
          </p>
        )}

        {/* SHORT DESCRIPTION */}
        {event.shortDescription && (
          <p className="text-center text-[var(--foreground)]/80 text-lg leading-relaxed max-w-2xl mx-auto">
            {event.shortDescription}
          </p>
        )}

        {/* CATEGORIES */}
        {categories.length > 0 && (
          <section className="bg-white border border-[var(--accent)]/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
              Categories
            </h2>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c.id} color="yellow">
                  {c.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* EVENT DETAILS */}
        <section className="space-y-6 text-[var(--foreground)]/90 text-lg">

          {/* DATE */}
          <div className="border-b border-[var(--muted)] pb-4">
            <strong className="text-[var(--foreground)] block mb-1">
              Date & Time
            </strong>
            {formattedDate}
          </div>

          {/* PRICE */}
          <div className="border-b border-[var(--muted)] pb-4">
            <strong className="text-[var(--foreground)] block mb-1">
              Price
            </strong>
            £{(event.pricePence / 100).toFixed(2)}
          </div>

          {/* AVAILABILITY */}
          <div className="border-b border-[var(--muted)] pb-4">
            <strong className="text-[var(--foreground)] block mb-1">
              Availability
            </strong>

            {soldOut ? (
              <span className="text-red-600 font-semibold">Sold Out</span>
            ) : remainingSeats <= 5 ? (
              <span className="text-amber-600 font-semibold">
                Limited seats available
              </span>
            ) : (
              <span className="text-green-700 font-semibold">
                Seats available
              </span>
            )}
          </div>

          {/* FULL DESCRIPTION */}
          {event.description && (
            <div className="pt-2">
              <strong className="text-[var(--foreground)] block mb-2">
                About This Event
              </strong>
              <p className="leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </section>

        {/* CTA CARD */}
        <section className="bg-white border border-[var(--accent)]/10 rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--foreground)]">
            Book Your Place
          </h2>

          <p className="text-[var(--foreground)]/70 mb-6">
            Reserve your seat now.
          </p>

          {/* BUTTON */}
          {soldOut ? (
            <Button variant="neutral" size="lg" disabled className="w-full opacity-60">
              Sold Out
            </Button>
          ) : (
            <BookNowButton eventId={event.id} />
          )}

          <Link
            href="/dashboard/legal/event-booking-terms"
            className="mt-4 block text-[var(--accent)] underline text-sm hover:opacity-80"
          >
            Booking Terms & Conditions
          </Link>
        </section>

      </div>
    </main>
  );
}
