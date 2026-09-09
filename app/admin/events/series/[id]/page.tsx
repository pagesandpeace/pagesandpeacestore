import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EventImageUpload } from "@/components/app-core/event-image-upload";
import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

function value(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function isUuid(input: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input); }

async function saveSeries(formData: FormData) {
  "use server";
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/series");
  const id = value(formData, "id");
  if (!isUuid(id)) throw new Error("Invalid event series");
  const capacity = Number(value(formData, "default_capacity"));
  const pricePence = Math.round(Number(value(formData, "default_ticket_price")) * 100);
  if (!value(formData, "name") || !value(formData, "default_title") || !value(formData, "default_description") || !Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(pricePence) || pricePence < 0) throw new Error("Please complete the required template fields.");

  const imageUrl = value(formData, "image_url") || null;
  const { error } = await appCoreDb().from("event_series").update({
    name: value(formData, "name"),
    short_description: value(formData, "series_short_description") || null,
    description: value(formData, "series_description") || null,
    image_url: imageUrl,
    seo_title: value(formData, "seo_title") || null,
    seo_description: value(formData, "seo_description") || null,
    is_public: formData.get("is_public") === "on",
    default_title: value(formData, "default_title"),
    default_subtitle: value(formData, "default_subtitle") || null,
    default_short_description: value(formData, "default_short_description") || null,
    default_description: value(formData, "default_description"),
    default_image_url: imageUrl,
    default_capacity: capacity,
    default_ticket_name: value(formData, "default_ticket_name") || "General admission",
    default_ticket_description: value(formData, "default_ticket_description") || null,
    default_ticket_price_pence: pricePence,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error("Unable to save event series");
  redirect("/admin/events/series");
}

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/series");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { data: series, error } = await appCoreDb().from("event_series").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load event series");
  if (!series) notFound();

  return <main className="mx-auto max-w-4xl px-6 py-10">
    <div className="mb-8"><Link href="/admin/events/series" className="text-sm underline underline-offset-4">← Event series</Link><h1 className="mt-4 text-3xl font-bold tracking-tight">Edit {series.name}</h1><p className="mt-2 text-sm text-foreground/60">Changes here affect future events created from this series. Existing event occurrences are not overwritten.</p></div>
    <form action={saveSeries} className="space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <input type="hidden" name="id" value={series.id} />
      <section className="space-y-4"><div><h2 className="text-lg font-semibold">Series landing page</h2><p className="mt-1 text-sm text-foreground/60">Content shown at /events/{series.slug}.</p></div>
        <label className="block text-sm font-medium">Series name<input name="name" required defaultValue={series.name} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Intro<textarea name="series_short_description" rows={3} defaultValue={series.short_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Full series description<textarea name="series_description" rows={7} defaultValue={series.description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <div><p className="text-sm font-medium">Series image</p><div className="mt-1"><EventImageUpload initialUrl={series.image_url ?? series.default_image_url} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">SEO title<input name="seo_title" defaultValue={series.seo_title ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">SEO description<input name="seo_description" defaultValue={series.seo_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label></div>
        <label className="flex items-center gap-3 text-sm font-medium"><input name="is_public" type="checkbox" defaultChecked={series.is_public} className="h-4 w-4" />Public series landing page</label>
      </section>

      <section className="space-y-4 border-t pt-8"><div><h2 className="text-lg font-semibold">New-event template</h2><p className="mt-1 text-sm text-foreground/60">These values pre-fill Create event when this series is selected. Date and time are always entered per occurrence.</p></div>
        <label className="block text-sm font-medium">Default event title<input name="default_title" required defaultValue={series.default_title ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Default subtitle<input name="default_subtitle" defaultValue={series.default_subtitle ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Default short description<textarea name="default_short_description" rows={3} defaultValue={series.default_short_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="block text-sm font-medium">Default full description<textarea name="default_description" required rows={7} defaultValue={series.default_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-medium">Capacity<input name="default_capacity" type="number" min="1" required defaultValue={series.default_capacity ?? 20} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Ticket name<input name="default_ticket_name" required defaultValue={series.default_ticket_name ?? "General admission"} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Price (£)<input name="default_ticket_price" type="number" min="0" step="0.01" required defaultValue={((series.default_ticket_price_pence ?? 0) / 100).toFixed(2)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label></div>
        <label className="block text-sm font-medium">Ticket description<input name="default_ticket_description" defaultValue={series.default_ticket_description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
      </section>
      <div className="flex items-center gap-4 border-t pt-6"><button type="submit" className="rounded-lg bg-black px-5 py-3 font-semibold text-white">Save series template</button><Link href="/admin/events/series" className="text-sm underline underline-offset-4">Cancel</Link></div>
    </form>
  </main>;
}
