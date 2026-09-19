"use client";

import { useState } from "react";

type Counts = { want_to_read: number; reading: number; read: number };

export default function ReadingStatusButtons({ bookId, initialCounts }: { bookId: string; initialCounts: Counts }) {
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<string | null>(null);
  async function choose(status: keyof Counts) {
    const next = selected === status ? null : status;
    const response = await fetch("/api/app-core/book-community/reading-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, status: next }) });
    const data = await response.json().catch(() => null);
    if (response.status === 401) { window.location.href = `/sign-in?callbackURL=${encodeURIComponent(window.location.pathname)}`; return; }
    if (response.ok) { setSelected(data.status); setCounts(data.counts); }
  }
  const options: [keyof Counts,string][] = [["want_to_read","Want to read"],["reading","Reading"],["read","Read"]];
  return <div className="mt-6 flex flex-wrap gap-2">{options.map(([value,label]) => <button key={value} type="button" onClick={() => choose(value)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${selected===value?"border-[#17221f] bg-[#17221f] text-white":"bg-white"}`}>{label} · {counts[value]}</button>)}</div>;
}
