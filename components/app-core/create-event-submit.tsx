"use client";

import { useFormStatus } from "react-dom";

export function CreateEventSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating event…" : "Create event"}
    </button>
  );
}
