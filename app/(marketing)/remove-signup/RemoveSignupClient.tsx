"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function RemoveSignupClient() {
  const params = useSearchParams();
  const email = params.get("email");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleDelete() {
    setLoading(true);

    await fetch("/api/remove-signup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center p-10">
        <h1 className="text-xl font-semibold">
          Your details have been removed.
        </h1>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 p-10">
      <h1 className="text-2xl font-semibold">
        Remove your details
      </h1>

      <p className="text-sm text-gray-600">
        {email || "No email found"}
      </p>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-4 py-2 border rounded hover:bg-gray-100"
      >
        {loading ? "Removing..." : "Confirm removal"}
      </button>
    </div>
  );
}