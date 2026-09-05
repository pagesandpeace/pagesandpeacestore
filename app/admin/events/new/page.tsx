import Link from "next/link";
import { redirect } from "next/navigation";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { CreateEventSubmit } from "@/components/app-core/create-event-submit";

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
    const { data, error } = await db
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

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

  if (
    !title ||
    !description ||
    !startsAtInput ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    !ticketName ||
    !Number.isInteger(pricePence) ||
    pricePence < 0
  ) {
    throw new Error("Please complete the required event and ticket details.");
  }

  const startsAt = new Date(startsAtInput);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Please provide a valid event date and time.");
  }

  const db = appCoreDb();

  // The browser supplies one stable ID for this form. A repeated submit therefore
  // resolves to the same event instead of creating a duplicate.
  const { data: existingEvent, error: existingError } = await db
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (existingError) throw new Error("Unable to check the event request.");
  if (existingEvent) redirect("/admin/events");

  const slug = await uniqueSlug(title);
  const status = value(formData, "status") === "published" ? "published" : "draft";

  const { data: event, error: eventError } = await db
    .from("events")
    .insert({
      id: eventId,
      slug,
      title,
      series_name: value(formData, "series_name") || null,
      subtitle: value(formData, "subtitle") || null,
      short_description: value(formData, "short_description") || null,
      description,
      starts_at: startsAt.toISOString(),
      capacity,
      image_url: value(formData, "image_url") || null,
      status,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    // A concurrent double-click can race the first insert. The primary key turns
    // that second request into a harmless success path.
    if (eventError?.code === "23505") {
      const { data: duplicate } = await db.from("events").select("id").eq("id", eventId).maybeSingle();
      if (duplicate) redirect("/admin/events");
    }
    throw new Error("Unable to create the event.");
  }

  const { error: ticketError } = await db.from("ticket_types").insert({
    event_id: event.id,
    name: ticketName,
    description: value(formData, "ticket_description") || null,
    price_pence: pricePence,
    capacity: capacity,
    is_active: true,
  });

  if (ticketError) {
    throw new Error("Event was created but its ticket type could not be added.");
  }

  redirect("/admin/events");
}

function EventRequestId() {
  return <input type="hidden" name="event_id" value={crypto.randomUUID()} />;
}

export default async function CreateEventPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/new");

  const { data: seriesRows, error: seriesError } = await appCoreDb().from("events").select("series_name").not("series_name", "is", null).order("series_name");
  if (seriesError) throw new Error("Unable to load event series.");
  const seriesOptions = [...new Set((seriesRows ?? []).map((row) => row.series_name).filter((name): name is string => Boolean(name)))];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/events" className="text-sm underline underline-offset-4">
          ← Events
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Create event</h1>
        <p className="mt-2 text-foreground/65">
          This creates a first-class event and ticket type in the new app_core system.
        </p>
      </div>

      <form action={createEvent} className="space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <EventRequestId />
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Event details</h2>

          <label className="block text-sm font-medium">
            Title
            <input name="title" required className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Event series (optional)
            <input name="series_name" list="event-series-options" placeholder="Choose an existing series or create one, e.g. Bingo Night" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            <datalist id="event-series-options">{seriesOptions.map((series) => <option key={series} value={series} />)}</datalist>
            <p className="mt-1 text-xs font-normal text-foreground/60">Choose a saved series or type a new one. A new name becomes available on the next event.</p>
          </label>

          <label className="block text-sm font-medium">
            Subtitle
            <input name="subtitle" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Short description
            <textarea name="short_description" rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Full description
            <textarea name="description" required rows={6} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Date and time
              <input name="starts_at" type="datetime-local" required className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>

            <label className="block text-sm font-medium">
              Total capacity
              <input name="capacity" type="number" min="1" defaultValue="20" required className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Image URL
            <input name="image_url" type="url" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Visibility
            <select name="status" defaultValue="draft" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal">
              <option value="draft">Draft — private</option>
              <option value="published">Published — public</option>
            </select>
          </label>
        </section>

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-lg font-semibold">First ticket type</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Ticket name
              <input name="ticket_name" required defaultValue="General admission" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>

            <label className="block text-sm font-medium">
              Price (£)
              <input name="ticket_price" type="number" min="0" step="0.01" required defaultValue="0.00" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Ticket description
            <input name="ticket_description" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
          </label>
        </section>

        <div className="flex items-center gap-4 border-t pt-6">
          <CreateEventSubmit />
          <Link href="/admin/events" className="text-sm underline underline-offset-4">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
