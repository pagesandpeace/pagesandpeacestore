"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";

export default function CancelAttendanceButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/events/cancel-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ eventId }),
      });

      if (!res.ok) throw new Error("Failed");

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCancel}
      disabled={loading}
      variant="outline"
      className="w-full"
    >
      {loading ? "Cancelling..." : "Cancel attendance"}
    </Button>
  );
}