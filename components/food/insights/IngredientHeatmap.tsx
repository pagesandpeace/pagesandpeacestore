"use client";

import { useMemo, Fragment } from "react";
import {
  IngredientUsageRow,
  getIntensity,
} from "./IngredientHeatmap.utils";

/* -------------------------------------------------------
   COLOURS (DO NOT TOUCH)
------------------------------------------------------- */

const INGREDIENT_COLORS: Record<string, string> = {
  Milk: "#8FBBD9",
  "Coffee beans": "#6B4E3D",
  "Chocolate powder": "#7A4A2E",
  "Tea bag": "#9AA56F",
  "Hot drink sundries": "#B5B5B5",
  "Toppings (cream, marshmallows)": "#CFA9C8",
};

type Granularity = "daily" | "weekly" | "annual";

/* -------------------------------------------------------
   DATE HELPERS
------------------------------------------------------- */

function getISOWeekStart(day: string) {
  const d = new Date(day + "T12:00:00");
  const jsDay = d.getDay() || 7;
  d.setDate(d.getDate() - jsDay + 1);
  return d.toISOString().slice(0, 10);
}

function getISOWeekEnd(weekStart: string) {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `W/C ${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`;
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function IngredientHeatmap({
  rows,
  granularity,
  maxDailyDays,
}: {
  rows: IngredientUsageRow[];
  granularity: Granularity;
  maxDailyDays?: number;
}) {
  const matrix = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { columns: [], rows: [] };
    }

    const bucketed: Record<string, Record<string, number>> = {};
    const units: Record<string, string> = {};
    const labels: Record<string, string> = {};

    let activeWeekStart: string | null = null;
    let activeWeekEnd: string | null = null;

    if (granularity === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      const currentWeekStart = getISOWeekStart(today);
      const currentWeekEnd = getISOWeekEnd(currentWeekStart);

      const hasCurrentWeekData = rows.some(
        (r) => r.day >= currentWeekStart && r.day <= currentWeekEnd
      );

      const latestDay = rows.map((r) => r.day).sort().at(-1);

      activeWeekStart = hasCurrentWeekData
        ? currentWeekStart
        : latestDay
        ? getISOWeekStart(latestDay)
        : null;

      activeWeekEnd = activeWeekStart
        ? getISOWeekEnd(activeWeekStart)
        : null;
    }

    for (const r of rows) {
      let key: string;
      let label: string;

      if (granularity === "daily") {
        if (
          !activeWeekStart ||
          r.day < activeWeekStart ||
          r.day > activeWeekEnd!
        ) {
          continue;
        }

        key = r.day;
        label = new Date(r.day + "T12:00:00").toLocaleDateString(
          "en-GB",
          { weekday: "short", day: "numeric" }
        );
      } else if (granularity === "weekly") {
        key = getISOWeekStart(r.day);
        label = formatWeekLabel(key);
      } else {
        key = r.day.slice(0, 4);
        label = key;
      }

      labels[key] = label;
      units[r.ingredient] = r.unit;

      bucketed[r.ingredient] ??= {};
      bucketed[r.ingredient][key] =
        (bucketed[r.ingredient][key] ?? 0) + r.used;
    }

    let columns = Object.keys(labels).sort();

    if (granularity === "daily" && maxDailyDays) {
      columns = columns.slice(-maxDailyDays);
    }

    return {
      columns,
      rows: Object.entries(bucketed).map(([ingredient, values]) => ({
        ingredient,
        unit: units[ingredient],
        cells: columns.map((c) => ({
          key: c,
          label: labels[c],
          value: values[c] ?? 0,
        })),
      })),
    };
  }, [rows, granularity, maxDailyDays]);

  if (!rows || rows.length === 0) {
    return (
      <div className="text-sm text-muted">
        No ingredient usage data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `180px repeat(${matrix.columns.length}, 1fr)`,
        }}
      >
        <div />
        {matrix.columns.map((c) => (
          <div
            key={c}
            className="text-xs text-muted text-center pb-2"
          >
            {matrix.rows[0]?.cells.find((x) => x.key === c)
              ?.label ?? ""}
          </div>
        ))}

        {matrix.rows.map((row) => {
          const max = Math.max(...row.cells.map((c) => c.value));

          return (
            <Fragment key={row.ingredient}>
              <div className="text-sm font-medium pr-4 py-1">
                {row.ingredient}
              </div>

              {row.cells.map((cell) => {
                const intensity = getIntensity(cell.value, max);

                return (
                  <div
                    key={cell.key}
                    title={`${row.ingredient} · ${cell.value} ${row.unit}`}
                    className="h-6 rounded-sm"
                    style={{
                      backgroundColor:
                        INGREDIENT_COLORS[row.ingredient] ?? "#999",
                      opacity:
                        cell.value === 0
                          ? 0.05
                          : 0.2 + intensity * 0.8,
                    }}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
