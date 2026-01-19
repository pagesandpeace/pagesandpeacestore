"use client";

import { useState } from "react";
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

type Granularity = "daily" | "weekly" | "annual";

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

  /* 🔑 SHARED GRANULARITY */
  const [granularity, setGranularity] =
    useState<Granularity>("daily");

  return (
    <div className="space-y-14">
      {/* =====================================================
         ACTIONS
      ===================================================== */}
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

      {/* =====================================================
         INSIGHTS
      ===================================================== */}
      <section className="space-y-16">
        {/* FOOD FLOW */}
        <FoodInsightsClient rows={foodRows} />

        {/* =================================================
           DRINK INSIGHTS (STACKED, SHARED CONTROLS)
        ================================================= */}
        <section className="space-y-10 max-w-7xl">
          {/* HEADER + GRANULARITY */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                Drink insights
              </h3>
              <p className="text-xs text-gray-600">
                Ingredients vs products · same time window
              </p>
            </div>

            <div className="flex gap-2">
              {(["daily", "weekly", "annual"] as Granularity[]).map(
                (g) => (
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
                )
              )}
            </div>
          </div>

          {/* INGREDIENT HEATMAP */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Ingredient usage
            </h4>

            <DrinkIngredientHeatMap
              rows={drinkIngredientRows}
              granularity={granularity}
              maxDailyDays={28}
            />
          </div>

          {/* PRODUCT SALES */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Drink product sales
            </h4>

            <DrinkProductChart
              rows={drinkProductRows}
              granularity={granularity}
              maxDailyDays={28}
            />
          </div>
        </section>
      </section>

      {/* =====================================================
         MODALS
      ===================================================== */}
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
