import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const orderId = formData.get("order_id") as string;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order_id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("order_items")
      .update({ picked_at: null })
      .eq("order_id", orderId);

    if (error) {
      console.error("[UNMARK PICKED DB ERROR]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.redirect(
      new URL("/admin/operations", req.url),
      { status: 303 }
    );
  } catch (err) {
    console.error("[UNMARK PICKED FATAL]", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
