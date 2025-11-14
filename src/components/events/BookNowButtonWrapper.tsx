"use client";

import BookNowButton from "./BookNowButton";

export default function BookNowButtonWrapper({
  eventId,
}: {
  eventId: string;
}) {
  return <BookNowButton eventId={eventId} />;
}
