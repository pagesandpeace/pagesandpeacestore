"use client";

type Props = {
  createdAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
};

function format(ts?: string | null) {
  if (!ts) return null;

  return new Date(ts).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderTimeline({
  createdAt,
  orderedAt,
  receivedAt,
}: Props) {
  return (
    <div className="flex gap-6 text-xs text-gray-600 mt-1">
      {createdAt && (
        <div>
          <div className="font-medium">Created</div>
          <div>{format(createdAt)}</div>
        </div>
      )}

      {orderedAt && (
        <div>
          <div className="font-medium">Ordered</div>
          <div>{format(orderedAt)}</div>
        </div>
      )}

      {receivedAt && (
        <div>
          <div className="font-medium">Received</div>
          <div>{format(receivedAt)}</div>
        </div>
      )}
    </div>
  );
}
