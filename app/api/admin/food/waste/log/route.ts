import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type WasteItem = {
  product_id: string;
  quantity: number;
};

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗑️ [FOOD WASTE LOG] start");

  try {
    const body = await req.json();
    const items: WasteItem[] = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No waste items provided" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (
        !item.product_id ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid product or quantity" },
          { status: 400 }
        );
      }
    }

    // Build stock movements
    const movements = items.map((item) => ({
  product_id: item.product_id,
  change: -Math.abs(item.quantity),
  reason: "food_waste",
  occurred_at: new Date().toISOString(),
}));

    const { error } = await supabaseAdmin
      .from("stock_movements")
      .insert(movements);

    if (error) {
      console.error("❌ Failed to log waste", error);
      return NextResponse.json(
        { error: "Failed to log waste" },
        { status: 500 }
      );
    }

    console.log("✅ Waste logged:", movements.length, "items");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("🟥 Waste log failed", err);

    return NextResponse.json(
      { error: "Failed to log waste" },
      { status: 500 }
    );
  }
}
