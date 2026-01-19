"use client";

import { useState } from "react";

export default function IgnoreRowItemButton({
  rawItemName,
}: {
  rawItemName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleIgnore() {
    setLoading(true);

    await fetch("/api/admin/food/ignore-by-raw-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_item_name: rawItemName }),
    });

    // force server component to re-run
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleIgnore}
      disabled={loading}
      className="mt-2 text-sm text-red-600 underline disabled:opacity-50"
    >
      {loading
        ? "Ignoring…"
        : `Always ignore “${rawItemName}”`}
    </button>
  );
}
