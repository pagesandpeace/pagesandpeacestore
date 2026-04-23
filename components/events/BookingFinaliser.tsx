"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FOOD_FORM_URL = "https://tally.so/r/Med4gl";

export function BookingFinaliser({
  sessionId,
  eventSlug,
  eventTitle,
}: {
  sessionId: string;
  eventSlug: string;
  eventTitle: string;
}) {
  const [status, setStatus] = useState<"waiting" | "confirmed" | "failed">(
    "waiting"
  );

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const { data, error } = await supabase
          .from("event_bookings")
          .select("id")
          .eq("stripe_checkout_session_id", sessionId)
          .limit(1);

        if (error) {
          console.error("❌ BookingFinaliser poll failed:", error);
        }

        if (data && data.length > 0) {
          setStatus("confirmed");
          clearInterval(interval);
          return;
        }

        if (attempts >= maxAttempts) {
          console.log("⚠️ Timeout — forcing confirmed UI");
          setStatus("confirmed");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("❌ BookingFinaliser unexpected error:", err);
        setStatus("failed");
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-[#1E3D34]" />
        <h1 className="mt-4 text-3xl font-bold">Finalising your booking...</h1>
        <p className="mt-3 text-foreground/70">
          Please wait a moment while we confirm your tickets.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <>
        <h1 className="text-3xl font-bold mb-4">Payment received ✅</h1>
        <p className="text-foreground/70 mb-6">
          Your payment was successful, but your booking is still being
          processed. If this does not update shortly, please contact support.
        </p>

        <Link href="/dashboard/events" className="underline text-accent">
          Go to My Bookings
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Booking confirmed 🎉</h1>

      <p className="text-foreground/80 mb-6 text-lg">
        Your place at <strong>{eventTitle}</strong> is secured.
      </p>

      <div className="bg-muted/40 border border-border rounded-xl p-6 mb-6 text-center">
        <h2 className="text-xl font-semibold mb-2">
          🍽️ Pre-order food for your event
        </h2>

        <p className="text-sm text-foreground/70 mb-4">
          Skip the queue and have everything ready when you arrive.
        </p>

        <a
          href={FOOD_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-accent text-white px-6 py-3 rounded-lg font-semibold"
        >
          Pre-order now
        </a>
      </div>

      <div className="space-y-4">
        <Link
          href={`/events/${eventSlug}`}
          className="block bg-accent text-white py-3 rounded-lg font-semibold text-center"
        >
          View Event Details
        </Link>

        <Link
          href="/dashboard/events"
          className="block text-accent underline text-center"
        >
          Go to My Bookings
        </Link>
      </div>
    </>
  );
}