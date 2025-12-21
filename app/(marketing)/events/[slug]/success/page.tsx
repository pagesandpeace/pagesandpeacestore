export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EventSuccessPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { slug } = params;
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/events");
  }

  const supabase = await supabaseServer();

  /* ------------------------------------------
     1. Fetch event
  ------------------------------------------- */
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event || eventErr) {
    console.error("❌ Event not found:", eventErr);
    redirect("/events");
  }

  /* ------------------------------------------
     2. Verify booking exists (safety check)
     NOTE: Webhook is authoritative
  ------------------------------------------- */
  const { data: booking } = await supabase
    .from("event_bookings")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!booking) {
    console.warn("⚠️ Booking not found for session:", sessionId);
    // Still show success page — Stripe payment already completed
  }

  /* ------------------------------------------
     3. Render
  ------------------------------------------- */
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-10">
      <div className="bg-white shadow-sm border border-accent/10 rounded-2xl max-w-xl p-10 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Booking confirmed 🎉
        </h1>

        <p className="text-foreground/80 mb-6 text-lg">
          Your place at <strong>{event.title}</strong> is secured.
        </p>

        <p className="text-foreground/70 mb-8">
          We’ve sent a confirmation email with your booking details.
          <br />
          You can view your booking anytime in your account.
        </p>

        <div className="space-y-4">
          <Link
            href={`/events/${event.slug}`}
            className="block bg-accent text-white py-3 rounded-lg font-semibold hover:opacity-90"
          >
            View Event Details
          </Link>

          <Link
            href="/dashboard/events"
            className="block text-accent underline"
          >
            Go to My Bookings
          </Link>

          <Link
            href="/events"
            className="block text-foreground/60 underline text-sm"
          >
            Back to All Events
          </Link>
        </div>
      </div>
    </main>
  );
}
