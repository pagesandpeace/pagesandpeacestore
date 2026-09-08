"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function ConsentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleChoice(consent: boolean) {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error("Unable to save marketing choice");
      }

      // The choice itself has been saved. If Beehiiv is temporarily unavailable,
      // the user should still be allowed into the dashboard without being asked again.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("We could not save your choice just now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF6F1] px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold text-[#111]">Join the club?</h1>

        <p className="text-[#555]">
          Get early access to events, book drops, and quiet moments at Pages &amp; Peace.
        </p>

        {error ? <p className="text-sm font-medium text-red-700" role="alert">{error}</p> : null}

        <div className="space-y-3 pt-4">
          <Button className="w-full" onClick={() => handleChoice(true)} disabled={loading}>
            {loading ? "Saving…" : "Yes, keep me updated"}
          </Button>

          <Button variant="outline" className="w-full" onClick={() => handleChoice(false)} disabled={loading}>
            No thanks
          </Button>
        </div>
      </div>
    </main>
  );
}
