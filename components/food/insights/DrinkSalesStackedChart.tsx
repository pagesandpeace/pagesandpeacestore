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

export type DrinkProductRow = {
  day: string; // already filtered & bucketed upstream
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
   COMPONENT
--------------------------------------------- */

export default function DrinkProductChart({
  rows,
}: {
  rows: DrinkProductRow[];
}) {
  const drinks = useMemo(
    () => Array.from(new Set(rows.map((r) => r.drink_name))),
    [rows]
  );

  const chartData: ChartRow[] = useMemo(() => {
    const map = new Map<string, ChartRow>();

    for (const r of rows) {
      if (!map.has(r.day)) {
        map.set(r.day, { x: r.day });
      }

      const entry = map.get(r.day)!;
      entry[r.drink_name] =
        Number(entry[r.drink_name] ?? 0) + r.units;
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [rows]);

  if (chartData.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        No drink sales data available
      </div>
    );
  }

  return (
    <div className="rounded border bg-white p-4">
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
    </div>
  );
}
