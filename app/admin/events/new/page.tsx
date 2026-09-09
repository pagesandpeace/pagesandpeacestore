import Link from "next/link";
import { redirect } from "next/navigation";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { CreateEventSubmit } from "@/components/app-core/create-event-submit";
import { EventImageUpload } from "@/components/app-core/event-image-upload";
import { EventSeriesTemplateSelector, type EventSeriesTemplate } from "@/components/app-core/event-series-template-selector";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(title: string) {
  const db = appCoreDb();
  const base = slugify(title) || "event";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const { data, error } = await db.from("events").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error("Unable to validate event slug");
    if (!data) return candidate;
  }

  throw new Error("Unable to create a unique event link");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function createEvent(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/new");

  const eventId = value(formData, "event_id");
  if (!isUuid(eventId)) throw new Error("Unable to create this event. Please refresh and try again.");

  const title = value(formData, "title");
  const description = value(formData, "description");
  const startsAtInput = value(formData, "starts_at");
  const capacity = Number(value(formData, "capacity"));
  const ticketName = value(formData, "ticket_name");
  const pricePence = Math.round(Number(value(formData, "ticket_price")) * 100);

  if (!title || !description || !startsAtInput || !Number.isInteger(capacity) || capacity < 1 || !ticketName || !Number.isInteger(pricePence) || pricePence < 0) {
    throw new Error("Please complete the required event and ticket details.");
  }

  const startsAt = new Date(startsAtInput);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Please provide a valid event date and time.");

  const db = appCoreDb();
  const { data: existingEvent, error: existingError } = await db.from("events").select("id").eq("id", eventId).maybeSingle();
  if (existingError) throw new Error("Unable to check the event request.");
  if (existingEvent) redirect("/admin/events");

  const slug = await uniqueSlug(title);
  const status = value(formData, "status") === "published" ? "published" : "draft";
  const seriesName = value(formData, "series_name") || null;
  const subtitle = value(formData, "subtitle") || null;
  const shortDescription = value(formData, "short_description") || null;
  const imageUrl = value(formData, "image_url") || null;
  const ticketDescription = value(formData, "ticket_description") || null;

  const { data: event, error: eventError } = await db
    .from("events")
    .insert({
      id: eventId,
      slug,
      title,
      series_name: seriesName,
      subtitle,
      short_description: shortDescription,
      description,
      starts_at: startsAt.toISOString(),
      capacity,
      image_url: imageUrl,
      status,
    })
    .select("id,series_id")
    .single();

  if (eventError || !event) {
    if (eventError?.code === "23505") {
      const { data: duplicate } = await db.from("events").select("id").eq("id", eventId).maybeSingle();
      if (duplicate) redirect("/admin/events");
    }
    throw new Error("Unable to create the event.");
  }

  const { error: ticketError } = await db.from("ticket_types").insert({
    event_id: event.id,
    name: ticketName,
    description: ticketDescription,
    price_pence: pricePence,
    capacity,
    is_active: true,
  });
  if (ticketError) throw new Error("Event was created but its ticket type could not be added.");

  // The first event in a brand-new series becomes that series' reusable starting template.
  // Existing series defaults are deliberately not overwritten by occurrence-specific edits.
  if (event.series_id) {
    await db.from("event_series").update({
      default_title: title,
      default_subtitle: subtitle,
      default_short_description: shortDescription,
      default_description: description,
      default_image_url: imageUrl,
      default_capacity: capacity,
      default_ticket_name: ticketName,
      default_ticket_description: ticketDescription,
      default_ticket_price_pence: pricePence,
    }).eq("id", event.series_id).is("default_title", null);
  }

  redirect("/admin/events");
}

function EventRequestId() {
  return <input type="hidden" name="event_id" value={crypto.randomUUID()} />;
}

type CreateEventProps = { searchParams: Promise<{ duplicate?: string | string[] }> };

export default async function CreateEventPage({ searchParams }: CreateEventProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/new");

  const requestedDuplicate = (await searchParams).duplicate;
  const duplicateId = typeof requestedDuplicate === "string" && isUuid(requestedDuplicate) ? requestedDuplicate : null;
  const db = appCoreDb();

  const [{ data: seriesRows, error: seriesError }, { data: sourceEvent, error: sourceError }] = await Promise.all([
    db.from("event_series").select("id,name,default_title,default_subtitle,default_short_description,default_description,default_image_url,default_capacity,default_ticket_name,default_ticket_description,default_ticket_price_pence").order("name"),
    duplicateId
      ? db.from("events").select("id,title,series_name,subtitle,short_description,description,starts_at,capacity,image_url").eq("id", duplicateId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (seriesError || sourceError) throw new Error("Unable to load event details.");

  const { data: sourceTickets, error: sourceTicketError } = sourceEvent
    ? await db.from("ticket_types").select("name,description,price_pence").eq("event_id", sourceEvent.id).order("created_at", { ascending: true }).limit(1)
    : { data: [], error: null };
  if (sourceTicketError) throw new Error("Unable to load event ticket details.");

  const sourceTicket = sourceTickets?.[0] ?? null;
  const templates = (seriesRows ?? []) as EventSeriesTemplate[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/events" className="text-sm underline underline-offset-4">← Events</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{sourceEvent ? "Duplicate event" : "Create event"}</h1>
        <p className="mt-2 text-foreground/65">
          {sourceEvent
            ? "The original stays untouched. This copies that exact occurrence; choose a new date and adjust anything that differs."
            : "Choose a series to load its standard event setup, or create a one-off event from scratch."}
        </p>
      </div>

      <form action={createEvent} className="space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <EventRequestId />
        <EventSeriesTemplateSelector templates={templates} initialSeriesName={sourceEvent?.series_name} duplicateMode={Boolean(sourceEvent)} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Event details</h2>

          <label className="block text-sm font-medium">Title
            <input name="title" required defaultValue={sourceEvent?.title ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">Subtitle
            <input name="subtitle" defaultValue={sourceEvent?.subtitle ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">Short description
            <textarea name="short_description" rows={2} defaultValue={sourceEvent?.short_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">Full description
            <textarea name="description" required rows={6} defaultValue={sourceEvent?.description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Date and time
              <input name="starts_at" type="datetime-local" required defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
            <label className="block text-sm font-medium">Total capacity
              <input name="capacity" type="number" min="1" defaultValue={sourceEvent?.capacity ?? 20} required className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
          </div>

          <div><p className="text-sm font-medium">Event image</p><div className="mt-1"><EventImageUpload initialUrl={sourceEvent?.image_url} /></div></div>

          <label className="block text-sm font-medium">Visibility
            <select name="status" defaultValue="draft" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal">
              <option value="draft">Draft — private</option>
              <option value="published">Published — public</option>
            </select>
          </label>
        </section>

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-lg font-semibold">Ticket setup</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Ticket name
              <input name="ticket_name" required defaultValue={sourceTicket?.name ?? "General admission"} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
            <label className="block text-sm font-medium">Price (£)
              <input name="ticket_price" type="number" min="0" step="0.01" required defaultValue={sourceTicket ? (sourceTicket.price_pence / 100).toFixed(2) : "0.00"} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
          </div>
          <label className="block text-sm font-medium">Ticket description
            <input name="ticket_description" defaultValue={sourceTicket?.description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>
        </section>

        <div className="flex items-center gap-4 border-t pt-6">
          <CreateEventSubmit />
          <Link href="/admin/events" className="text-sm underline underline-offset-4">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
