export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import StartEventCheckout from "@/components/events/StartEventCheckout";
import InterestButton from "@/components/events/InterestButton";
import AttendButton from "@/components/events/AttendButton";
import CancelInterestButton from "@/components/events/CancelInterestButton";
import CancelAttendanceButton from "@/components/events/CancelAttendanceButton";

export default async function EventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await props.params;

  const supabase = await supabaseServer();

  /* --------------------------- AUTH --------------------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <main className="min-h-screen p-8 text-center">
        <p className="text-sm opacity-70">
          Please sign in to view this event.
        </p>
      </main>
    );
  }

  /* ------------------------ EVENT ------------------------ */
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

  const bookingType = event.booking_type as "ticketed" | "interest";

  /* -------------------- TICKET TYPES -------------------- */
  const { data: ticketTypes } = await supabase
    .from("event_ticket_types")
    .select(`
      id,
      name,
      price_pence,
      product_id,
      is_default
    `)
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (
    bookingType === "ticketed" &&
    (!ticketTypes || ticketTypes.length === 0)
  ) {
    return (
      <main className="min-h-screen p-8 text-center">
        <p className="text-sm text-red-600">
          No ticket types configured for this event.
        </p>
      </main>
    );
  }

  /* ---------------------- SERVICE ROLE ---------------------- */
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ---------------------- CAPACITY ---------------------- */
  const { data: paidSeats } = await supabaseAdmin
    .from("event_bookings")
    .select("id")
    .eq("event_id", eventId)
    .eq("paid", true)
    .eq("cancelled", false);

  const usedSeats = paidSeats?.length ?? 0;
  const remainingSeats = event.capacity - usedSeats;

  const soldOut =
    bookingType === "ticketed" && remainingSeats <= 0;

  /* ---------------------- USER STATE (ROBUST FIX) ---------------------- */

// get profile id
const { data: profile } = await supabaseAdmin
  .from("users")
  .select("id")
  .eq("auth_user_id", user.id)
  .single();

const profileId = profile?.id;

// check BOTH ids
const [{ data: interestRows }, { data: attendanceRows }] =
  await Promise.all([
    supabaseAdmin
      .from("event_interest")
      .select("id")
      .eq("event_id", eventId)
      .in("user_id", [user.id, profileId].filter(Boolean)) // 🔥 KEY FIX
      .limit(1),

    supabaseAdmin
      .from("event_attendance")
      .select("id")
      .eq("event_id", eventId)
      .in("user_id", [user.id, profileId].filter(Boolean)) // 🔥 KEY FIX
      .limit(1),
  ]);

const isInterested = !!interestRows?.length;
const isAttending = !!attendanceRows?.length;

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
        {/* INFO */}
        <section className="space-y-6 text-neutral-700 text-lg">
          <div>
            <strong>Date & Time</strong>
            <div>{formattedDate}</div>
          </div>

          <div>
            <strong>Availability</strong>
            <div>
              {bookingType === "ticketed" ? (
                soldOut ? (
                  <span className="text-red-600 font-semibold">
                    Sold Out
                  </span>
                ) : (
                  <span className="text-green-700 font-semibold">
                    Seats available
                  </span>
                )
              ) : (
                <span className="text-blue-700 font-semibold">
                  Open for interest
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

        {/* CTA */}
        <section className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-semibold text-center">
            {bookingType === "ticketed"
              ? "Choose your ticket"
              : "Register your interest"}
          </h2>

          {bookingType === "ticketed" ? (
            soldOut ? (
              <button
                disabled
                className="bg-red-300 text-white px-8 py-3 rounded-lg font-semibold opacity-70 w-full"
              >
                Sold Out
              </button>
            ) : (
              <StartEventCheckout
  eventId={eventId}
  ticketTypes={ticketTypes ?? []} // ✅ FIX
  maxQuantity={remainingSeats}
/>
            )
          ) : (
            <div className="space-y-3">

              {/* ATTENDING */}
              {isAttending && (
  <div className="space-y-3">
    <button
      disabled
      className="w-full bg-green-600 text-black py-3 rounded-lg font-semibold"
    >
      ✓ You are attending
    </button>

    {/* 🔥 THIS WAS MISSING */}
    <CancelAttendanceButton eventId={event.id} />
  </div>
)}

              {/* INTERESTED */}
              {!isAttending && isInterested && (
                <>
                  <div className="text-sm text-blue-700 text-center">
                    ✓ You are interested
                  </div>

                  <AttendButton eventId={event.id} />
                  <CancelInterestButton eventId={event.id} />
                </>
              )}

              {/* NONE */}
              {!isAttending && !isInterested && (
                <InterestButton eventId={event.id} />
              )}
            </div>
          )}

          <Link
            href="/legal/event-booking-terms"
            className="underline text-sm text-[var(--accent)] block text-center"
          >
            Booking Terms & Conditions
          </Link>
        </section>
      </div>
    </main>
  );
}