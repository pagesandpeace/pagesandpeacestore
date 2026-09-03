import Link from "next/link";
import { redirect } from "next/navigation";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

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

async function createEvent(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/new");

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
  const slug = await uniqueSlug(title);
  const status = value(formData, "status") === "published" ? "published" : "draft";

  const { data: event, error: eventError } = await db
    .from("events")
    .insert({
      slug,
      title,
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

export default async function CreateEventPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/new");

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
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Event details</h2>

          <label className="block text-sm font-medium">
            Title
            <input name="title" required className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" />
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
          <button type="submit" className="rounded-lg bg-black px-5 py-3 font-semibold text-white">
            Create event
          </button>
          <Link href="/admin/events" className="text-sm underline underline-offset-4">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
