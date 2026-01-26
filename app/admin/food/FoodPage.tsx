"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

import UploadSalesModal from "@/components/food/UploadSalesModal";
import StockInModal from "@/components/food/StockInModal";
import LogWasteModal from "@/components/food/LogWasteModal";

import FoodInsightsClient from "@/components/food/insights/FoodInsightsClient";
import DrinkIngredientHeatMap from "@/components/food/insights/IngredientHeatmap";
import DrinkProductChart from "@/components/food/insights/DrinkSalesStackedChart";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type DrinkGranularity = "daily" | "weekly" | "quarterly" | "annual";

export type FoodFlowRow = {
  day: string;
  supplier_id: string | null;
  stock_in: number;
  sales: number;
  waste: number;
};

export type IngredientUsageRow = {
  day: string;
  ingredient: string;
  unit: string;
  used: number;
};

export type DrinkProductRow = {
  day: string;
  drink_name: string;
  units: number;
};

type Props = {
  foodRows: FoodFlowRow[];
  drinkIngredientRows: IngredientUsageRow[];
  drinkProductRows: DrinkProductRow[];
};

/* ---------------------------------------------
   DATE HELPERS
--------------------------------------------- */

function getWeekStart(day: string) {
  const d = new Date(day + "T12:00:00");
  const jsDay = d.getDay() || 7;
  d.setDate(d.getDate() - jsDay + 1);
  return d.toISOString().slice(0, 10);
}

function getQuarterKey(day: string) {
  const d = new Date(day + "T12:00:00");
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function getYearKey(day: string) {
  return day.slice(0, 4);
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function FoodPage({
  foodRows,
  drinkIngredientRows,
  drinkProductRows,
}: Props) {
  const [activeModal, setActiveModal] = useState<
    "upload-sales" | "stock-in" | "log-waste" | null
  >(null);

  /* 🔑 SHARED DRINK GRANULARITY */
  const [drinkGranularity, setDrinkGranularity] =
    useState<DrinkGranularity>("daily");

  /* ---------------------------------------------
     DRINK PRODUCT WINDOWING
  --------------------------------------------- */

  const windowedDrinkProductRows = useMemo(() => {
    const sorted = [...drinkProductRows].sort((a, b) =>
      a.day.localeCompare(b.day)
    );

    if (drinkGranularity === "daily") {
      return sorted.slice(-7);
    }

    if (drinkGranularity === "weekly") {
      const weeks = new Map<string, DrinkProductRow[]>();

      for (const r of sorted) {
        const key = getWeekStart(r.day);
        weeks.set(key, [...(weeks.get(key) ?? []), r]);
      }

      return Array.from(weeks.values())
        .slice(-7)
        .flat();
    }

    if (drinkGranularity === "quarterly") {
      const quarters = new Map<string, DrinkProductRow[]>();

      for (const r of sorted) {
        const key = getQuarterKey(r.day);
        quarters.set(key, [...(quarters.get(key) ?? []), r]);
      }

      return Array.from(quarters.entries())
        .slice(-7)
        .flatMap(([quarter, rows]) =>
          rows.map((r) => ({ ...r, day: quarter }))
        );
    }

    // annual
    const years = new Map<string, DrinkProductRow[]>();

    for (const r of sorted) {
      const key = getYearKey(r.day);
      years.set(key, [...(years.get(key) ?? []), r]);
    }

    return Array.from(years.entries()).flatMap(
      ([year, rows]) =>
        rows.map((r) => ({ ...r, day: year }))
    );
  }, [drinkProductRows, drinkGranularity]);

  /* ---------------------------------------------
     DRINK INGREDIENT WINDOWING
  --------------------------------------------- */

  const windowedDrinkIngredientRows = useMemo(() => {
    const sorted = [...drinkIngredientRows].sort((a, b) =>
      a.day.localeCompare(b.day)
    );

    if (drinkGranularity === "daily") {
      return sorted.slice(-7);
    }

    if (drinkGranularity === "weekly") {
      const weeks = new Map<string, IngredientUsageRow[]>();

      for (const r of sorted) {
        const key = getWeekStart(r.day);
        weeks.set(key, [...(weeks.get(key) ?? []), r]);
      }

      return Array.from(weeks.values())
        .slice(-7)
        .flat();
    }

    if (drinkGranularity === "quarterly") {
      const quarters = new Map<string, IngredientUsageRow[]>();

      for (const r of sorted) {
        const key = getQuarterKey(r.day);
        quarters.set(key, [...(quarters.get(key) ?? []), r]);
      }

      return Array.from(quarters.entries())
        .slice(-7)
        .flatMap(([quarter, rows]) =>
          rows.map((r) => ({ ...r, day: quarter }))
        );
    }

    // annual
    const years = new Map<string, IngredientUsageRow[]>();

    for (const r of sorted) {
      const key = getYearKey(r.day);
      years.set(key, [...(years.get(key) ?? []), r]);
    }

    return Array.from(years.entries()).flatMap(
      ([year, rows]) =>
        rows.map((r) => ({ ...r, day: year }))
    );
  }, [drinkIngredientRows, drinkGranularity]);

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="space-y-14">
      {/* ACTIONS */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Food Operations</h2>

        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={() => setActiveModal("stock-in")}
          >
            Stock In
          </Button>

          <Button onClick={() => setActiveModal("upload-sales")}>
            Upload Sales
          </Button>

          <Button
            variant="neutral"
            onClick={() => setActiveModal("log-waste")}
          >
            Log Waste
          </Button>
        </div>
      </section>

      {/* INSIGHTS */}
      <section className="space-y-16">
        <FoodInsightsClient rows={foodRows} />

        <section className="space-y-10 max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                Drink insights
              </h3>
              <p className="text-xs text-gray-600">
                Ingredients vs products · same time window
              </p>
            </div>

            <div className="flex gap-2">
              {(
                ["daily", "weekly", "quarterly", "annual"] as DrinkGranularity[]
              ).map((g) => (
                <button
                  key={g}
                  onClick={() => setDrinkGranularity(g)}
                  className={`px-3 py-1.5 rounded text-sm border ${
                    drinkGranularity === g
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {g[0].toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <DrinkIngredientHeatMap
            rows={windowedDrinkIngredientRows}
          />

          <DrinkProductChart
            rows={windowedDrinkProductRows}
          />
        </section>
      </section>

      {/* MODALS */}
      {activeModal === "upload-sales" && (
        <UploadSalesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "stock-in" && (
        <StockInModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "log-waste" && (
        <LogWasteModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
