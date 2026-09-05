"use client";

import { useFormStatus } from "react-dom";

export function DeleteEventButton() {
  const { pending } = useFormStatus();
  const label = "Archive event";
  const warning = "Archive this event and remove it from public sale? Booking history and data will be preserved.";

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
