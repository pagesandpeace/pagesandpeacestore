export type IngredientUsageRow = {
  day: string;         // YYYY-MM-DD
  ingredient: string;
  unit: string;
  used: number;
};

export type HeatmapCell = {
  day: string;
  value: number;
};

export type HeatmapRow = {
  ingredient: string;
  unit: string;
  total: number;
  cells: HeatmapCell[];
};

/* -------------------------------------------------------
   Build heatmap matrix
------------------------------------------------------- */
export function buildHeatmapMatrix(rows: IngredientUsageRow[]): {
  days: string[];
  data: HeatmapRow[];
} {
  if (!rows || rows.length === 0) {
    return { days: [], data: [] };
  }

  const days = Array.from(
    new Set(rows.map((r) => r.day))
  ).sort();

  const byIngredient = new Map<string, HeatmapRow>();

  for (const row of rows) {
    if (!byIngredient.has(row.ingredient)) {
      byIngredient.set(row.ingredient, {
        ingredient: row.ingredient,
        unit: row.unit,
        total: 0,
        cells: days.map((d) => ({
          day: d,
          value: 0,
        })),
      });
    }

    const entry = byIngredient.get(row.ingredient)!;
    entry.total += row.used;

    const cell = entry.cells.find((c) => c.day === row.day);
    if (cell) {
      cell.value += row.used;
    }
  }

  const data = Array.from(byIngredient.values()).sort(
    (a, b) => b.total - a.total
  );

  return { days, data };
}

/* -------------------------------------------------------
   Intensity scaling (per ingredient)
------------------------------------------------------- */
export function getIntensity(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(value / max, 1);
}
