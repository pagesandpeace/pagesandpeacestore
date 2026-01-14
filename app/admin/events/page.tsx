// app/admin/events/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import AdminEventsTable from "@/components/admin/events/AdminEventsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEventsPage() {
  const supabase = await supabaseServer();

  /* --------------------------------------------------
     AUTH
  -------------------------------------------------- */
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/sign-in?callbackURL=/admin/events");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* --------------------------------------------------
     FETCH EVENTS + BOOKINGS
  -------------------------------------------------- */
  const { data: events, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      subtitle,
      slug,
      date,
      price_pence,
      image_url,
      capacity,
      published,
      event_bookings (
        id,
        cancelled
      )
    `)
    .order("date", { ascending: true });

  if (error) {
    console.error("EVENT FETCH ERROR:", error);
  }

  const normalisedEvents =
    events?.map((e) => ({
      ...e,
      event_bookings:
        e.event_bookings?.filter((b) => !b.cancelled) ?? [],
    })) ?? [];

  const now = new Date();

  const upcoming = normalisedEvents.filter(
    (e) => new Date(e.date) >= now
  );

  const archived = normalisedEvents.filter(
    (e) => new Date(e.date) < now
  );

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>

        <Link href="/admin/events/new">
          <Button variant="primary">+ Create Event</Button>
        </Link>
      </div>

      {/* UPCOMING */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming</h2>
        <AdminEventsTable events={upcoming} />
      </section>

      {/* ARCHIVED */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Archived</h2>
        <AdminEventsTable events={archived} />
      </section>
    </div>
  );
}
