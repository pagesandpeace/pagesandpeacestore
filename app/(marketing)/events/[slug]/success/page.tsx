export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookingFinaliser } from "@/components/events/BookingFinaliser";

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
     2. Render (client finalises booking)
  ------------------------------------------- */
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-10">
      <div className="bg-white shadow-sm border border-accent/10 rounded-2xl max-w-xl p-10 text-center">
        <BookingFinaliser
          sessionId={sessionId}
          eventSlug={event.slug}
          eventTitle={event.title}
        />
      </div>
    </main>
  );
}
