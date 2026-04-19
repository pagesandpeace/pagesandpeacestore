"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function RemoveSignupPage() {
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
      <div className="text-center">
        <h1>Your details have been removed.</h1>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1>Remove your details</h1>
      <p>{email}</p>

      <button onClick={handleDelete} disabled={loading}>
        {loading ? "Removing..." : "Confirm removal"}
      </button>
    </div>
  );
}