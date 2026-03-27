// app/admin/events/page.tsx

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import AdminEventsTable from "@/components/admin/events/AdminEventsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEventsPage() {
  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/sign-in?callbackURL=/admin/events");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  console.log("🟥 [ADMIN] auth user:", auth.user.id);
  console.log("🟥 [ADMIN] profile.role =", profile?.role);
  console.log("🟥 [ADMIN] ✅ admin access granted");

  /* ---------------- SERVICE ROLE CLIENT ---------------- */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ---------------- FETCH EVENTS ---------------- */
  const { data: events, error } = await admin
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
      booking_type,

      event_bookings (
        id,
        cancelled
      ),

      event_interest (
        id
      )
    `)
    .order("date", { ascending: true });

  if (error) {
    console.error("❌ EVENT FETCH ERROR:", error);
  }

  console.log("📦 RAW EVENTS:", events);
  console.log("📦 EVENTS COUNT:", events?.length);

  /* ---------------- FETCH ATTENDANCE ---------------- */
  const { data: attendance } = await admin
    .from("event_attendance")
    .select("event_id");

  console.log("👥 RAW ATTENDANCE:", attendance);

  /* ---------------- BUILD MAP ---------------- */
  const attendanceMap = new Map<string, number>();

  for (const row of attendance || []) {
    const count = attendanceMap.get(row.event_id) || 0;
    attendanceMap.set(row.event_id, count + 1);
  }

  console.log("🗺 ATTENDANCE MAP:", Array.from(attendanceMap.entries()));

  /* ---------------- NORMALISE ---------------- */
  const normalisedEvents =
    events?.map((e) => ({
      ...e,
      event_bookings:
        e.event_bookings?.filter((b) => !b.cancelled) ?? [],
      interest_count: e.event_interest?.length ?? 0,
      attending_count: attendanceMap.get(e.id) || 0,
    })) ?? [];

  console.log("🧾 NORMALISED EVENTS:", normalisedEvents);

  const now = new Date();

  const upcoming = normalisedEvents.filter(
    (e) => new Date(e.date.replace(" ", "T")) >= now
  );

  const archived = normalisedEvents.filter(
    (e) => new Date(e.date.replace(" ", "T")) < now
  );

  console.log("🚀 UPCOMING EVENTS:", upcoming);
  console.log("📦 ARCHIVED EVENTS:", archived);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>

        <Link href="/admin/events/new">
          <Button variant="primary">+ Create Event</Button>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming</h2>
        <AdminEventsTable events={upcoming} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Archived</h2>
        <AdminEventsTable events={archived} />
      </section>
    </div>
  );
}