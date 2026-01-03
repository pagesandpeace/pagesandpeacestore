import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/* -----------------------------
   HARD FAIL HELPER (KEEP)
----------------------------- */
function fail(where: string): never {
  throw new Error("BOOKING PAGE FAIL → " + where);
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await supabaseServer();

  /* -----------------------------
     AUTH USER
  ----------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const bookerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "You (booker)";

  /* -----------------------------
     ORDER (RLS: orders_select_own)
  ----------------------------- */
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status, stripe_checkout_session_id")
    .eq("id", orderId)
    .single();

  if (!order) fail("NO ORDER");

  /* -----------------------------
     EVENT ORDER ITEM
     (THIS IS THE TRUE LINK)
  ----------------------------- */
  const { data: eventItems } = await supabase
    .from("order_items")
    .select("id, event_id, quantity")
    .eq("order_id", orderId)
    .eq("kind", "event");

  if (!eventItems || eventItems.length === 0) {
    fail("NO EVENT ITEM");
  }

  const eventItem = eventItems[0];

  /* -----------------------------
     EVENT (PUBLIC READ)
  ----------------------------- */
  const { data: event } = await supabase
    .from("events")
    .select(`
      id,
      title,
      subtitle,
      short_description,
      description,
      date,
      capacity,
      price_pence,
      image_url,
      published
    `)
    .eq("id", eventItem.event_id)
    .single();

  if (!event) fail("NO EVENT");

  /* -----------------------------
     LOAD SEATS (CORRECT LINK)
     ✅ order_item_id (authoritative)
     🔁 fallback to session id
  ----------------------------- */
  const { data: seats } = await supabase
    .from("event_bookings")
    .select("id, name, refunded, cancelled")
    .eq("order_item_id", eventItem.id)
    .order("created_at", { ascending: true });

  if (!seats || seats.length === 0) {
    fail("NO SEATS");
  }

  /* -----------------------------
     DERIVED COUNTS
  ----------------------------- */
  const totalTickets = eventItem.quantity;
  const activeTickets = seats.filter(
    (s) => !s.refunded && !s.cancelled
  ).length;

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <main className="mx-auto max-w-3xl space-y-12">
      {/* EVENT HERO */}
      <section className="overflow-hidden rounded-2xl bg-neutral-900 text-white shadow">
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-56 w-full object-cover opacity-90"
          />
        )}

        <div className="space-y-3 p-8">
          <h1 className="text-3xl font-semibold">{event.title}</h1>

          {event.subtitle && (
            <p className="text-lg opacity-90">{event.subtitle}</p>
          )}

          <p className="text-sm opacity-80">
            {new Date(event.date).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="flex flex-wrap gap-4 text-sm opacity-90">
            {event.capacity && <span>👥 Capacity: {event.capacity}</span>}
            {event.price_pence && (
              <span>💷 £{(event.price_pence / 100).toFixed(2)}</span>
            )}
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm">
            🎟️{" "}
            {activeTickets === 0
              ? "All tickets refunded"
              : activeTickets === totalTickets
              ? `${totalTickets} ${totalTickets === 1 ? "ticket" : "tickets"} booked`
              : `${activeTickets} of ${totalTickets} tickets active`}
          </div>
        </div>
      </section>

      {/* EVENT DESCRIPTION */}
      {(event.short_description || event.description) && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold">About this event</h2>

          {event.short_description && (
            <p className="text-sm text-neutral-700">
              {event.short_description}
            </p>
          )}

          {event.description && (
            <p className="whitespace-pre-line text-sm text-neutral-700">
              {event.description}
            </p>
          )}
        </section>
      )}

      {/* TICKETS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your tickets</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {seats.map((seat, idx) => {
            const isBooker = idx === 0;

const displayName =
  seat.name ||
  (isBooker ? bookerName : `Guest ${idx + 1}`);


            const refunded = seat.refunded || seat.cancelled;

            return (
              <div
                key={seat.id}
                className={`rounded-xl border p-5 shadow-sm ${
                  refunded ? "bg-neutral-100 opacity-60" : "bg-white"
                }`}
              >
                <p className="text-sm text-neutral-500">
                  Ticket {idx + 1}
                  {isBooker && " • Booker"}
                </p>
                <p className="font-medium">{displayName}</p>
                <p className="text-xs mt-1">
                  {refunded ? "Refunded" : "Active"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PAYMENT */}
      <section className="rounded-xl border bg-white p-6 text-sm text-neutral-700 shadow-sm">
        <h3 className="mb-2 font-medium">Payment summary</h3>
        <p><strong>Total paid:</strong> £{order.total}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="capitalize">{order.status}</span>
        </p>
      </section>
    </main>
  );
}
