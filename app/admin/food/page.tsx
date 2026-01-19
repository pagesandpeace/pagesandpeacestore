import { createClient } from "@supabase/supabase-js";
import FoodPage from "./FoodPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

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

/* ---------------------------------------------
   TYPE GUARDS
--------------------------------------------- */

function isFoodFlowRow(r: unknown): r is FoodFlowRow {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof (r as FoodFlowRow).day === "string"
  );
}

function isIngredientUsageRow(
  r: unknown
): r is IngredientUsageRow {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof (r as IngredientUsageRow).day === "string" &&
    typeof (r as IngredientUsageRow).ingredient === "string" &&
    typeof (r as IngredientUsageRow).unit === "string"
  );
}

function isDrinkProductRow(
  r: unknown
): r is DrinkProductRow {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof (r as DrinkProductRow).day === "string" &&
    typeof (r as DrinkProductRow).drink_name === "string"
  );
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function FoodOverviewPage() {
  /* ---------- FOOD FLOW ---------- */
  const { data: foodData, error: foodError } =
    await supabaseAdmin.rpc("get_food_flow_daily");

  if (foodError) {
    console.error("❌ FOOD FLOW RPC ERROR:", foodError);
    throw new Error("Failed to load food flow data");
  }

  const foodRows: FoodFlowRow[] = (foodData ?? [])
    .filter(isFoodFlowRow)
    .map((r: FoodFlowRow) => ({
      day: r.day,
      supplier_id: r.supplier_id ?? null,
      stock_in: Number(r.stock_in ?? 0),
      sales: Number(r.sales ?? 0),
      waste: Number(r.waste ?? 0),
    }));

  /* ---------- DRINK INGREDIENT USAGE ---------- */
  const { data: ingredientData, error: ingredientError } =
    await supabaseAdmin.rpc("get_drink_ingredient_usage_daily");

  if (ingredientError) {
    console.error(
      "❌ INGREDIENT USAGE RPC ERROR:",
      ingredientError
    );
    throw new Error("Failed to load drink ingredient usage");
  }

  const drinkIngredientRows: IngredientUsageRow[] =
    (ingredientData ?? [])
      .filter(isIngredientUsageRow)
      .map((r: IngredientUsageRow) => ({
        day: r.day,
        ingredient: r.ingredient,
        unit: r.unit,
        used: Number(r.used ?? 0),
      }));

  /* ---------- DRINK PRODUCT SALES ---------- */
  const { data: productData, error: productError } =
    await supabaseAdmin.rpc("get_drink_sales_daily");

  if (productError) {
    console.error(
      "❌ DRINK SALES RPC ERROR:",
      productError
    );
    throw new Error("Failed to load drink product sales");
  }

  const drinkProductRows: DrinkProductRow[] =
    (productData ?? [])
      .filter(isDrinkProductRow)
      .map((r: DrinkProductRow) => ({
        day: r.day,
        drink_name: r.drink_name,
        units: Number(r.units ?? 0),
      }));

  /* ---------- RENDER ---------- */
  return (
    <FoodPage
      foodRows={foodRows}
      drinkIngredientRows={drinkIngredientRows}
      drinkProductRows={drinkProductRows}
    />
  );
}
