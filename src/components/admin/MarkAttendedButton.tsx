"use client";

import { Button } from "@/components/ui/Button";

export default function MarkAttendedButton() {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-green-700"
      onClick={() => alert("Attendance marking coming soon.")}
    >
      Mark Attended
    </Button>
  );
}
