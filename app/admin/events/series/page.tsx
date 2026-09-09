import Link from "next/link";
import { redirect } from "next/navigation";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventSeriesAdminPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/events/series");

  const db = appCoreDb();
  const [{ data: series, error }, { data: eventCounts, error: countError }] = await Promise.all([
    db.from("event_series").select("id,name,slug,is_public,default_title,default_capacity,default_ticket_price_pence").order("name"),
    db.from("events").select("series_id").not("series_id", "is", null),
  ]);
  if (error || countError) throw new Error("Unable to load event series");

  const counts = new Map<string, number>();
  for (const row of eventCounts ?? []) counts.set(row.series_id, (counts.get(row.series_id) ?? 0) + 1);

  return <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link href="/admin/events" className="text-sm underline underline-offset-4">← Events</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Event series</h1>
        <p className="mt-2 text-sm text-foreground/60">Edit the reusable template and public landing page for recurring events.</p>
      </div>
      <Link href="/admin/events/new" className="rounded-lg bg-black px-4 py-3 font-semibold text-white">Create event</Link>
    </div>

    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-[#f8f5f1] text-foreground/70"><tr><th className="px-5 py-4 font-medium">Series</th><th className="px-5 py-4 font-medium">Events</th><th className="px-5 py-4 font-medium">Default</th><th className="px-5 py-4 font-medium">Public page</th><th className="px-5 py-4 font-medium">Actions</th></tr></thead>
          <tbody className="divide-y">{(series ?? []).map(row => <tr key={row.id}>
            <td className="px-5 py-4"><p className="font-semibold">{row.name}</p><p className="mt-1 text-xs text-foreground/55">/events/{row.slug}</p></td>
            <td className="px-5 py-4 text-foreground/70">{counts.get(row.id) ?? 0}</td>
            <td className="px-5 py-4 text-foreground/70"><p>{row.default_title || "Not set"}</p><p className="mt-1 text-xs">{row.default_capacity ?? "—"} places · {row.default_ticket_price_pence == null ? "—" : `£${(row.default_ticket_price_pence / 100).toFixed(2)}`}</p></td>
            <td className="px-5 py-4"><span className="rounded-full bg-[#f2eee8] px-2.5 py-1 text-xs font-medium">{row.is_public ? "Public" : "Hidden"}</span></td>
            <td className="px-5 py-4"><div className="flex gap-3"><Link href={`/admin/events/series/${row.id}`} className="font-medium underline underline-offset-4">Edit template</Link>{row.is_public ? <Link href={`/events/${row.slug}`} target="_blank" className="font-medium underline underline-offset-4">View page</Link> : null}</div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </main>;
}
