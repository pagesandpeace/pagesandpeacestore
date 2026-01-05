"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function BookingFinaliser({
  sessionId,
  eventSlug,
  eventTitle,
}: {
  sessionId: string;
  eventSlug: string;
  eventTitle: string;
}) {
  const [status, setStatus] = useState<
    "waiting" | "confirmed" | "failed"
  >("waiting");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const interval = setInterval(async () => {
      attempts++;

      const { data } = await supabase
        .from("event_bookings")
        .select("id")
        .eq("stripe_checkout_session_id", sessionId)
        .limit(1);

      if (data && data.length > 0) {
        setStatus("confirmed");
        clearInterval(interval);
      }

      if (attempts >= maxAttempts) {
        setStatus("failed");
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (status === "waiting") {
    return (
      <>
        <h1 className="text-3xl font-bold mb-4">Finalising your booking…</h1>
        <p className="text-foreground/70">
          Please wait a moment while we confirm your tickets.
        </p>
      </>
    );
  }

  if (status === "failed") {
    return (
      <>
        <h1 className="text-3xl font-bold mb-4">
          Payment received ✅
        </h1>
        <p className="text-foreground/70 mb-6">
          Your payment was successful, but your booking is still being processed.
          If this doesn’t update shortly, please contact support.
        </p>

        <Link href="/dashboard/events" className="underline text-accent">
          Go to My Bookings
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">
        Booking confirmed 🎉
      </h1>

      <p className="text-foreground/80 mb-6 text-lg">
        Your place at <strong>{eventTitle}</strong> is secured.
      </p>

      <div className="space-y-4">
        <Link
          href={`/events/${eventSlug}`}
          className="block bg-accent text-white py-3 rounded-lg font-semibold"
        >
          View Event Details
        </Link>

        <Link
          href="/dashboard/events"
          className="block text-accent underline"
        >
          Go to My Bookings
        </Link>
      </div>
    </>
  );
}
