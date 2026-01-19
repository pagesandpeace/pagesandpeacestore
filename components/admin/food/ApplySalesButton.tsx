"use client";

import { useState } from "react";

export default function ApplySalesButton({
  fromDay,
  toDay,
  disabled,
}: {
  fromDay: string;
  toDay: string;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/food/apply-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_day: fromDay,
          to_day: toDay,
        }),
      });

      const j = await res.json();

      if (!res.ok) {
        alert(j?.error ?? "Failed to apply sales");
        return;
      }

      alert(
        `Applied ${j.applied} sale lines to stock\n${fromDay} → ${toDay}`
      );
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleApply}
        className="border px-3 py-2 rounded text-sm bg-black text-white disabled:opacity-40"
      >
        {loading ? "Applying…" : "Apply to Stock"}
      </button>

      <div className="text-xs text-muted-foreground">
        Append-only stock movements<br />
        reason = <strong>sale</strong>
      </div>
    </div>
  );
}
