import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteEventButton } from "@/components/app-core/delete-event-button";
import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

const read = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const dateInput = (value: string) => new Date(value).toISOString().slice(0, 16);
type Props = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminUser();
  if (!admin) redirect(`/sign-in?callbackURL=/admin/events/${id}/edit`);

  const db = appCoreDb();
  const [{ data: event, error }, { data: tickets, error: ticketError }, { count: bookingCount, error: countError }] = await Promise.all([
    db.from("events").select("id,title,subtitle,short_description,description,starts_at,capacity,image_url,status").eq("id", id).maybeSingle(),
    db.from("ticket_types").select("id,name,description,price_pence,is_active").eq("event_id", id).order("created_at", { ascending: true }).limit(1),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  if (error || ticketError || countError) throw new Error("Unable to load this event.");
  if (!event) notFound();
  const ticket = tickets?.[0] ?? null;
  const hasBookings = (bookingCount ?? 0) > 0;

  async function save(formData: FormData) {
    "use server";
    if (!await requireAdminUser()) redirect(`/sign-in?callbackURL=/admin/events/${id}/edit`);
    const title = read(formData, "title");
    const description = read(formData, "description");
    const date = new Date(read(formData, "starts_at"));
    const capacity = Number(read(formData, "capacity"));
    const requestedStatus = read(formData, "status");
    const status = ["draft", "published", "cancelled", "archived"].includes(requestedStatus) ? requestedStatus : "draft";
    if (!title || !description || Number.isNaN(date.getTime()) || !Number.isInteger(capacity) || capacity < 0) throw new Error("Please complete valid event details.");

    const service = appCoreDb();
    const { data: bookings, error: bookingError } = await service.from("bookings").select("quantity").eq("event_id", id).in("status", ["pending", "confirmed"]);
    if (bookingError) throw new Error("Unable to verify event bookings.");
    const reserved = (bookings ?? []).reduce((total, booking) => total + booking.quantity, 0);
    if (capacity < reserved) throw new Error(`Capacity cannot be lower than the ${reserved} reserved tickets.`);

    const { error: updateError } = await service.from("events").update({
      title, description, capacity, status, starts_at: date.toISOString(),
      subtitle: read(formData, "subtitle") || null,
      short_description: read(formData, "short_description") || null,
      image_url: read(formData, "image_url") || null,
    }).eq("id", id);
    if (updateError) throw new Error("Unable to save this event.");

    if (ticket) {
      const ticketName = read(formData, "ticket_name");
      const pricePence = Math.round(Number(read(formData, "ticket_price")) * 100);
      if (!ticketName || !Number.isInteger(pricePence) || pricePence < 0) throw new Error("Please provide a valid ticket name and price.");
      const { error: ticketUpdateError } = await service.from("ticket_types").update({
        name: ticketName,
        description: read(formData, "ticket_description") || null,
        price_pence: pricePence,
        capacity,
        is_active: read(formData, "ticket_active") === "on",
      }).eq("id", ticket.id);
      if (ticketUpdateError) throw new Error("Event saved but its ticket type could not be updated.");
    }
    redirect("/admin/events");
  }

  async function remove() {
    "use server";
    if (!await requireAdminUser()) redirect(`/sign-in?callbackURL=/admin/events/${id}/edit`);
    const service = appCoreDb();
    const { count, error: bookingError } = await service.from("bookings").select("id", { count: "exact", head: true }).eq("event_id", id);
    if (bookingError) throw new Error("Unable to check event history.");
    if ((count ?? 0) > 0) {
      const { error: archiveError } = await service.from("events").update({ status: "archived" }).eq("id", id);
      if (archiveError) throw new Error("Unable to archive this event.");
    } else {
      const { error: ticketError } = await service.from("ticket_types").delete().eq("event_id", id);
      if (ticketError) throw new Error("Unable to remove ticket types.");
      const { error: deleteError } = await service.from("events").delete().eq("id", id);
      if (deleteError) throw new Error("Unable to delete this event.");
    }
    redirect("/admin/events");
  }

  return <main className="mx-auto max-w-3xl px-6 py-10">
    <Link href="/admin/events" className="text-sm underline underline-offset-4">← Events</Link>
    <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit event</h1>
    <form action={save} className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium">Title<input name="title" required defaultValue={event.title} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-medium">Subtitle<input name="subtitle" defaultValue={event.subtitle ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-medium">Short description<textarea name="short_description" rows={2} defaultValue={event.short_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-medium">Full description<textarea name="description" required rows={6} defaultValue={event.description} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Date and time<input name="starts_at" type="datetime-local" required defaultValue={dateInput(event.starts_at)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Total capacity<input name="capacity" type="number" min="0" required defaultValue={event.capacity} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      </div>
      <label className="block text-sm font-medium">Image URL<input name="image_url" type="url" defaultValue={event.image_url ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-medium">Visibility<select name="status" defaultValue={event.status} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"><option value="draft">Draft — private</option><option value="published">Published — public</option><option value="cancelled">Cancelled — not for sale</option><option value="archived">Archived — removed from sale</option></select></label>
      {ticket ? <section className="space-y-4 border-t pt-6"><h2 className="text-lg font-semibold">Ticket type</h2><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Ticket name<input name="ticket_name" required defaultValue={ticket.name} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Price (£)<input name="ticket_price" type="number" min="0" step="0.01" required defaultValue={(ticket.price_pence / 100).toFixed(2)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label></div><label className="block text-sm font-medium">Ticket description<input name="ticket_description" defaultValue={ticket.description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="flex items-center gap-2 text-sm font-medium"><input name="ticket_active" type="checkbox" defaultChecked={ticket.is_active} /> Available for sale</label></section> : null}
      <div className="flex gap-4 border-t pt-5"><button type="submit" className="rounded-lg bg-black px-5 py-3 font-semibold text-white">Save changes</button><Link href="/admin/events" className="py-3 text-sm underline">Cancel</Link></div>
    </form>
    <form action={remove} className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="font-semibold text-red-900">{hasBookings ? "Archive event" : "Delete unused event"}</h2>
      <p className="mt-1 text-sm text-red-800">{hasBookings ? "Because bookings exist, this event will be safely archived—not deleted." : "This permanently removes an event with no booking history."}</p>
      <div className="mt-4"><DeleteEventButton hasBookings={hasBookings} /></div>
    </form>
  </main>;
}