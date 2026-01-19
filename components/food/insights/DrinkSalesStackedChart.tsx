"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type Granularity = "daily" | "weekly" | "annual";

export type DrinkProductRow = {
  day: string;
  drink_name: string;
  units: number;
};

type ChartRow = {
  x: string;
  [key: string]: number | string;
};

/* ---------------------------------------------
   COLOURS
--------------------------------------------- */

const DRINK_COLORS: Record<string, string> = {
  Americano: "#6B4E3D",
  Espresso: "#4A2F24",
  Latte: "#C9A66B",
  "Flat White": "#BFA27A",
  Cappuccino: "#A67C52",
  Mocha: "#7A4A2E",
  "Hot Chocolate": "#5C3A1E",
  "Luxury Hot Chocolate": "#3F2615",
  "Yorkshire Tea": "#9AA56F",
  "Pot of tea": "#A0AD6F",
  "Iced Latte": "#8FBBD9",
  Water: "#9EC9E2",
  Pop: "#E6A5A5",
  "Fruit Shoot": "#F2B880",
};

/* ---------------------------------------------
   DATE HELPERS
--------------------------------------------- */

function getWeekStart(day: string): string {
  const d = new Date(day + "T12:00:00");
  const jsDay = d.getDay() || 7;
  d.setDate(d.getDate() - jsDay + 1);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function formatDay(day: string) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatWeek(weekStart: string) {
  const d = new Date(weekStart + "T12:00:00");
  return `W/C ${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`;
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function DrinkProductChart({
  rows,
  granularity,
  maxDailyDays,
}: {
  rows: DrinkProductRow[];
  granularity: Granularity;
  maxDailyDays?: number;
}) {
  const drinks = useMemo(
    () => Array.from(new Set(rows.map((r) => r.drink_name))),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (granularity !== "daily") return rows;
    if (rows.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const currentWeekStart = getWeekStart(today);
    const currentWeekEnd = getWeekEnd(currentWeekStart);

    const hasCurrentWeekData = rows.some(
      (r) => r.day >= currentWeekStart && r.day <= currentWeekEnd
    );

    const latestDay = rows.map((r) => r.day).sort().at(-1)!;

    const targetWeekStart = hasCurrentWeekData
      ? currentWeekStart
      : getWeekStart(latestDay);

    const targetWeekEnd = getWeekEnd(targetWeekStart);

    return rows.filter(
      (r) => r.day >= targetWeekStart && r.day <= targetWeekEnd
    );
  }, [rows, granularity]);

  const chartData: ChartRow[] = useMemo(() => {
    const map = new Map<string, ChartRow>();

    for (const r of filteredRows) {
      let key: string;
      let label: string;

      if (granularity === "daily") {
        key = r.day;
        label = formatDay(r.day);
      } else if (granularity === "weekly") {
        key = getWeekStart(r.day);
        label = formatWeek(key);
      } else {
        key = r.day.slice(0, 4);
        label = key;
      }

      map.set(key, {
        ...(map.get(key) ?? { x: label }),
        [r.drink_name]:
          Number(map.get(key)?.[r.drink_name] ?? 0) + r.units,
      });
    }

    let sorted = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    if (granularity === "daily" && maxDailyDays) {
      sorted = sorted.slice(-maxDailyDays);
    }

    return sorted;
  }, [filteredRows, granularity, maxDailyDays]);

  return (
    <div className="rounded border bg-white p-4">
      {chartData.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No drink sales data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />

            {drinks.map((drink) => (
              <Bar
                key={drink}
                dataKey={drink}
                stackId="drinks"
                fill={DRINK_COLORS[drink] ?? "#999"}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
