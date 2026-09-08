"use client";

import { useEffect, useState } from "react";

type HoursRow = {
  day_of_week: number;
  day_name: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const fallback: HoursRow[] = [
  { day_of_week: 1, day_name: "Monday", open_time: "09:00", close_time: "21:00", is_closed: false },
  { day_of_week: 2, day_name: "Tuesday", open_time: "09:00", close_time: "21:00", is_closed: false },
  { day_of_week: 3, day_name: "Wednesday", open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 4, day_name: "Thursday", open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 5, day_name: "Friday", open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 6, day_name: "Saturday", open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 7, day_name: "Sunday", open_time: "10:00", close_time: "16:00", is_closed: false },
];

function formatTime(value: string | null) {
  if (!value) return "";
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export default function OpeningHours() {
  const [hours, setHours] = useState<HoursRow[]>(fallback);

  useEffect(() => {
    fetch("/api/opening-hours", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.hours) && data.hours.length) setHours(data.hours);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ul className="mt-2 space-y-1">
      {hours.map((row) => (
        <li key={row.day_of_week}>
          {row.day_name}: {row.is_closed ? "Closed" : `${formatTime(row.open_time)} – ${formatTime(row.close_time)}`}
        </li>
      ))}
    </ul>
  );
}
