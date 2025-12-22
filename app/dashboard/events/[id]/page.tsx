export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import StartEventCheckout from "@/components/events/StartEventCheckout";

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await props.params;
  const supabase = await supabaseServer();

  /* --------------------------- GET USER --------------------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <main className="min-h-screen p-8 text-center">
        <p className="text-sm opacity-70">Please sign in to view this event.</p>
      </main>
    );
  }

  /* ------------------------ FETCH EVENT ------------------------ */
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium">Event not found.</p>
      </main>
    );
  }

  /* ---------------------- FETCH BOOKINGS ---------------------- */
  const { data: allBookings } = await supabase
    .from("event_bookings")
    .select("cancelled")
    .eq("event_id", eventId);

  const activeBookings =
    (allBookings ?? []).filter((b) => !b.cancelled).length;

  const remainingSeats = event.capacity - activeBookings;
  const soldOut = remainingSeats <= 0;

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ---------------------- UI ---------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1]">
      {/* HERO */}
      <div className="relative w-full h-[50vh] min-h-[300px]">
        <Image
          src={event.image_url || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <h1 className="absolute bottom-8 left-8 text-white text-4xl font-extrabold">
          {event.title}
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-10">

        <section className="space-y-6 text-neutral-700 text-lg">
          <div>
            <strong>Date & Time</strong>
            <div>{formattedDate}</div>
          </div>

          <div>
            <strong>Price</strong>
            <div>£{(event.price_pence / 100).toFixed(2)} per ticket</div>
          </div>

          <div>
            <strong>Availability</strong>
            <div>
              {soldOut ? (
                <span className="text-red-600 font-semibold">Sold Out</span>
              ) : (
                <span className="text-green-700 font-semibold">
                  {remainingSeats} seats remaining
                </span>
              )}
            </div>
          </div>

          {event.description && (
            <div>
              <strong>About this event</strong>
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          )}
        </section>

        {/* CHECKOUT */}
        <section className="bg-white border rounded-xl p-6 shadow-sm text-center space-y-6">
          <h2 className="text-xl font-semibold">Book Tickets</h2>

          {!soldOut && (
            <StartEventCheckout
              eventId={eventId}
              maxQuantity={remainingSeats}
            />
          )}

          {soldOut && (
            <button
              disabled
              className="bg-red-300 text-white px-8 py-3 rounded-lg font-semibold opacity-70"
            >
              Sold Out
            </button>
          )}

          <Link
            href="/dashboard/legal/event-booking-terms"
            className="underline text-sm text-[var(--accent)] block"
          >
            Booking Terms & Conditions
          </Link>
        </section>
      </div>
    </main>
  );
}
