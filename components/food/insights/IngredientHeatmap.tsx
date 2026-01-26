"use client";

import { useMemo, Fragment } from "react";
import {
  IngredientUsageRow,
  buildHeatmapMatrix,
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

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function IngredientHeatmap({
  rows,
}: {
  rows: IngredientUsageRow[];
}) {
  const matrix = useMemo(() => {
    return buildHeatmapMatrix(rows);
  }, [rows]);

  if (!rows || rows.length === 0 || matrix.days.length === 0) {
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
          gridTemplateColumns: `180px repeat(${matrix.days.length}, 1fr)`,
        }}
      >
        {/* HEADER ROW */}
        <div />
        {matrix.days.map((day) => (
          <div
            key={day}
            className="text-xs text-muted text-center pb-2"
          >
            {new Date(day + "T12:00:00").toLocaleDateString(
              "en-GB",
              { weekday: "short", day: "numeric" }
            )}
          </div>
        ))}

        {/* INGREDIENT ROWS */}
        {matrix.data.map((row) => {
          const max = Math.max(
            ...row.cells.map((c) => c.value)
          );

          return (
            <Fragment key={row.ingredient}>
              <div className="text-sm font-medium pr-4 py-1">
                {row.ingredient}
              </div>

              {row.cells.map((cell) => {
                const intensity = getIntensity(cell.value, max);

                return (
                  <div
                    key={cell.day}
                    title={`${row.ingredient} · ${cell.value} ${row.unit}`}
                    className="h-6 rounded-sm"
                    style={{
                      backgroundColor:
                        INGREDIENT_COLORS[row.ingredient] ??
                        "#999",
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
