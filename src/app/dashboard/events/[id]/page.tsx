export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  eventBookings,
  events,
  eventCategoryLinks,
  eventCategories,
  stores,
} from "@/lib/db/schema";

import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { StartEventCheckout } from "@/components/StartEventCheckout";

export default async function DashboardEventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await props.params;

  const user = await getCurrentUserServer();
  if (!user) redirect(`/sign-in?callbackURL=/dashboard/events/${eventId}`);

  /* FETCH EVENT */
  const event = (
    await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  )[0];

  if (!event) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Event Not Found</h1>
      </main>
    );
  }

  /* FETCH CATEGORY IDS */
  const categoryLinks = await db
    .select()
    .from(eventCategoryLinks)
    .where(eq(eventCategoryLinks.eventId, eventId));

  const categoryIds = categoryLinks.map((c) => c.categoryId);

  /* FETCH CATEGORIES */
  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(eventCategories)
          .where(inArray(eventCategories.id, categoryIds))
      : [];

  /* FETCH STORE */
  const store = event.storeId
    ? (
        await db
          .select()
          .from(stores)
          .where(eq(stores.id, event.storeId))
          .limit(1)
      )[0]
    : null;

  /* USER BOOKINGS */
  const bookings = await db
    .select()
    .from(eventBookings)
    .where(
      and(eq(eventBookings.userId, user.id), eq(eventBookings.eventId, eventId))
    );

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-[#FAF6F1]">

      {/* FULL WIDTH HERO */}
      <div className="relative w-full h-[50vh] min-h-[320px]">
        <Image
          src={event.imageUrl || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover object-center"
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
            <strong className="text-[#111] block mb-1">Location</strong>
            {store?.address || store?.name || "Pages & Peace"}
          </div>

          <div className="border-b border-neutral-300 pb-4">
            <strong className="text-[#111] block mb-1">Price</strong>
            £{(event.pricePence / 100).toFixed(2)}
          </div>

          <div className="border-b border-neutral-300 pb-4">
            <strong className="text-[#111] block mb-1">Capacity</strong>
            {event.capacity} seats
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

        {/* CHECKOUT */}
        <section className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm text-center space-y-6">
          
          <h2 className="text-xl font-semibold">
            {bookings.length > 0 ? "Bring a Friend" : "Book Your Place"}
          </h2>

          <p className="text-neutral-700">
            {bookings.length > 0
              ? "You already have a seat. Want to add another?"
              : "Reserve your seat now."}
          </p>

          <StartEventCheckout eventId={eventId} />

          {/* TERMS LINK BELOW BUTTON */}
          <div className="pt-2">
            <Link
              href="/events/booking-terms"
              className="underline text-sm text-[var(--accent)] hover:opacity-80 block"
            >
              Booking Terms & Conditions
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
