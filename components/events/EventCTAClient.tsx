"use client";

import { useState } from "react";
import AttendButton from "./AttendButton";
import InterestButton from "./InterestButton";
import CancelAttendanceButton from "./CancelAttendanceButton";
import CancelInterestButton from "./CancelInterestButton";

export default function EventCTAClient({
  eventId,
  initialInterested,
  initialAttending,
}: {
  eventId: string;
  initialInterested: boolean;
  initialAttending: boolean;
}) {
  const [status, setStatus] = useState<
    "attending" | "interested" | "none"
  >(
    initialAttending
      ? "attending"
      : initialInterested
      ? "interested"
      : "none"
  );

  if (status === "attending") {
    return (
      <div className="space-y-3">
        <div className="w-full border-2 bg-accent text-white py-3 rounded-full text-center">
          ✓ You're attending
        </div>

        <CancelAttendanceButton
          eventId={eventId}
          onSuccess={() => setStatus("none")}
        />
      </div>
    );
  }

  if (status === "interested") {
    return (
      <div className="space-y-3">
        <div className="w-full border-2 bg-light-green py-3 rounded-full text-center">
          ✓ You're on the list
        </div>

        <AttendButton
          eventId={eventId}
          onSuccess={() => setStatus("attending")}
        />

        <CancelInterestButton
          eventId={eventId}
          onSuccess={() => setStatus("none")}
        />
      </div>
    );
  }

  return (
    <InterestButton
      eventId={eventId}
      onSuccess={() => setStatus("interested")}
    />
  );
}