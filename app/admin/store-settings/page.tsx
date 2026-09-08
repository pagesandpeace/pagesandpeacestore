"use client";

import { useEffect, useState } from "react";

type HoursRow = {
  day_of_week: number;
  day_name: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export default function StoreSettingsPage() {
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/app-core/admin/opening-hours", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setHours(data.hours ?? []))
      .catch(() => setMessage("Could not load opening hours"));
  }, []);

  function update(day: number, patch: Partial<HoursRow>) {
    setHours((current) => current.map((row) => row.day_of_week === day ? { ...row, ...patch } : row));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/app-core/admin/opening-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    setMessage(res.ok ? "Opening hours saved" : data?.error || "Could not save opening hours");
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground/60">Website content</p>
        <h1 className="mt-1 text-3xl font-bold">Opening hours</h1>
        <p className="mt-2 text-foreground/65">Update the hours shown on the public Contact page.</p>
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <div className="space-y-3">
          {hours.map((row) => (
            <div key={row.day_of_week} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
              <div className="font-medium">{row.day_name}</div>
              <input type="time" disabled={row.is_closed} value={(row.open_time ?? "09:00").slice(0,5)} onChange={(e) => update(row.day_of_week, { open_time: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-gray-100" />
              <input type="time" disabled={row.is_closed} value={(row.close_time ?? "17:00").slice(0,5)} onChange={(e) => update(row.day_of_week, { close_time: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-gray-100" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.is_closed} onChange={(e) => update(row.day_of_week, { is_closed: e.target.checked })} /> Closed</label>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button onClick={save} disabled={saving || !hours.length} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save opening hours"}</button>
          {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}
