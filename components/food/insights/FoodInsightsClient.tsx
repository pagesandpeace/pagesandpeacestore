"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type Granularity = "daily" | "weekly" | "quarterly" | "annual";

export type FoodFlowRow = {
  day: string;
  supplier_id?: string | null;
  stock_in: number;
  sales: number;
  waste: number;
};

type ChartRow = {
  label: string;
  stock_in: number;
  sales: number;
  waste: number;
};

/* ---------------------------------------------
   CONSTANTS
--------------------------------------------- */

const FOUR_EYES_SUPPLIER_ID =
  "deed1f3a-5a1b-4f1e-bc60-057c84eb68a4";

/* ---------------------------------------------
   DATE HELPERS
--------------------------------------------- */

function getWeekStart(day: string): string {
  const d = new Date(day + "T12:00:00");
  const jsDay = d.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  d.setDate(d.getDate() - (isoDay - 1));
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  return `Week commencing ${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`;
}

function getQuarterKey(day: string): string {
  const d = new Date(day + "T12:00:00");
  const year = d.getFullYear();
  const quarter = Math.floor(d.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function formatQuarterLabel(key: string): string {
  const [year, q] = key.split("-Q");
  return `Q${q} ${year}`;
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function FoodInsightsClient({
  rows,
}: {
  rows: FoodFlowRow[];
}) {
  /* ---------------- NORMALISE ---------------- */

  const safeRows = useMemo<FoodFlowRow[]>(() => {
    return rows
      .filter((r) => !!r.day)
      .map((r) => ({
        day: r.day,
        supplier_id: r.supplier_id ?? null,
        stock_in: Number(r.stock_in ?? 0),
        sales: Number(r.sales ?? 0),
        waste: Number(r.waste ?? 0),
      }));
  }, [rows]);

  /* ---------------- STATE ---------------- */

  const today = new Date();
  const isMonday = today.getDay() === 1;

  const [granularity, setGranularity] =
    useState<Granularity>(isMonday ? "daily" : "weekly");

  const [supplierFilter, setSupplierFilter] =
    useState<"all" | "four_eyes">("all");

  /* ---------------- SUPPLIER FILTER ---------------- */

  const filteredRows = useMemo(() => {
    if (supplierFilter === "all") return safeRows;

    return safeRows.filter(
      (r) => r.supplier_id === FOUR_EYES_SUPPLIER_ID
    );
  }, [safeRows, supplierFilter]);

  /* ---------------- AGGREGATION ---------------- */

  const chartData: ChartRow[] = useMemo(() => {
    if (!filteredRows.length) return [];

    const map = new Map<string, ChartRow>();

    for (const r of filteredRows) {
      let key: string;
      let label: string;

      if (granularity === "daily") {
        key = r.day;
        label = new Date(key + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      } else if (granularity === "weekly") {
        key = getWeekStart(r.day);
        label = formatWeekLabel(key);
      } else if (granularity === "quarterly") {
        key = getQuarterKey(r.day);
        label = formatQuarterLabel(key);
      } else {
        key = r.day.slice(0, 4);
        label = key;
      }

      if (!map.has(key)) {
        map.set(key, {
          label,
          stock_in: 0,
          sales: 0,
          waste: 0,
        });
      }

      const row = map.get(key)!;
      row.stock_in += r.stock_in;
      row.sales += r.sales;
      row.waste += r.waste;
    }

    let result = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // 🔁 rolling windows
    if (
      granularity === "daily" ||
      granularity === "weekly" ||
      granularity === "quarterly"
    ) {
      result = result.slice(-7);
    }

    return result;
  }, [filteredRows, granularity]);

  /* ---------------- TOTALS ---------------- */

  const totals = useMemo(
    () =>
      chartData.reduce(
        (acc, r) => {
          acc.stock_in += r.stock_in;
          acc.sales += r.sales;
          acc.waste += r.waste;
          return acc;
        },
        { stock_in: 0, sales: 0, waste: 0 }
      ),
    [chartData]
  );

  /* ---------------- AXIS DOMAINS ---------------- */

  const maxUnits = useMemo(
    () =>
      Math.max(
        1,
        ...chartData.map((r) =>
          Math.max(r.stock_in, r.sales)
        )
      ),
    [chartData]
  );

  const maxWaste = useMemo(
    () => Math.max(1, ...chartData.map((r) => r.waste)),
    [chartData]
  );

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER + TOTALS */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Food flow</h2>
          <p className="text-xs text-gray-600">
            Units received, sold and wasted
          </p>
        </div>

        <div className="text-right text-xs leading-5">
          <div>
            <span className="text-gray-500">Stock in:</span>{" "}
            <span className="font-medium">{totals.stock_in}</span>
          </div>
          <div>
            <span className="text-gray-500">Units sold:</span>{" "}
            <span className="font-medium">{totals.sales}</span>
          </div>
          <div>
            <span className="text-gray-500">Waste:</span>{" "}
            <span className="font-medium">{totals.waste}</span>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2">
        <button
          onClick={() => setSupplierFilter("all")}
          className={`px-3 py-1.5 rounded text-sm border ${
            supplierFilter === "all"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700"
          }`}
        >
          All food
        </button>

        <button
          onClick={() => setSupplierFilter("four_eyes")}
          className={`px-3 py-1.5 rounded text-sm border ${
            supplierFilter === "four_eyes"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700"
          }`}
        >
          Four Eyes only
        </button>
      </div>

      {/* GRANULARITY */}
      <div className="flex gap-2">
        {(
          ["daily", "weekly", "quarterly", "annual"] as Granularity[]
        ).map((g) => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`px-3 py-1.5 rounded text-sm border ${
              granularity === g
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700"
            }`}
          >
            {g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div className="rounded border bg-white p-4">
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />

              <YAxis
                yAxisId="units"
                allowDecimals={false}
                domain={[0, maxUnits]}
              />

              <YAxis
                yAxisId="waste"
                orientation="right"
                allowDecimals={false}
                domain={[0, maxWaste]}
              />

              <Tooltip />
              <Legend />

              <Bar
                yAxisId="units"
                dataKey="stock_in"
                name="Units received"
                fill="#475569"
                barSize={30}
                minPointSize={6}
                isAnimationActive={false}
              />

              <Line
                yAxisId="units"
                type="monotone"
                dataKey="sales"
                name="Units sold"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />

              <Line
                yAxisId="waste"
                type="monotone"
                dataKey="waste"
                name="Units wasted"
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
