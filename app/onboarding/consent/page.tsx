"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function ConsentPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChoice(consent: boolean) {
    setLoading(true);

    try {
      await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consent }),
      });
    } catch (err) {
      console.error(err);
    }

    // 🔥 ALWAYS go dashboard after decision
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF6F1] px-6">
      <div className="max-w-md w-full space-y-6 text-center">

        <h1 className="text-3xl font-semibold text-[#111]">
          Join the club?
        </h1>

        <p className="text-[#555]">
          Get early access to events, book drops, and quiet moments at Pages & Peace.
        </p>

        <div className="space-y-3 pt-4">

          <Button
            className="w-full"
            onClick={() => handleChoice(true)}
            disabled={loading}
          >
            Yes, keep me updated
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleChoice(false)}
            disabled={loading}
          >
            No thanks
          </Button>

        </div>

      </div>
    </main>
  );
}