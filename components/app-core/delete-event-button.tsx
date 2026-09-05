"use client";

import { useFormStatus } from "react-dom";

export function DeleteEventButton({ hasBookings }: { hasBookings: boolean }) {
  const { pending } = useFormStatus();
  const label = hasBookings ? "Archive event" : "Delete event";
  const warning = hasBookings
    ? "This event has bookings. It will be archived and removed from public sale, not deleted. Continue?"
    : "Delete this unused event and its ticket types? This cannot be undone.";

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(warning)) event.preventDefault();
      }}
      className="rounded-lg border border-red-300 px-4 py-3 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}
