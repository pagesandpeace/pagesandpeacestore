"use client";

import { useToast } from "@/components/ui/useToast";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export default function RequestCancellationButton({
  bookingId,
  eventTitle,
  onSuccess,
}: {
  bookingId: string;
  eventTitle: string;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("bookingId", bookingId);

      const res = await fetch("/api/events/request-cancellation", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Cancellation Requested",
        description: `We've received your request for: ${eventTitle}`,
        variant: "success",
      });

      if (onSuccess) onSuccess();
    } catch {
      toast({
        title: "Error",
        description: "Could not request cancellation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRequest}
      disabled={loading}
      className="text-red-700 hover:text-red-800"
    >
      {loading ? "Sending..." : "Request Cancellation"}
    </Button>
  );
}
