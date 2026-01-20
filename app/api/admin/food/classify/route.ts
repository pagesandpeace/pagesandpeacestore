import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  const body = await req.json();

  // 🚫 Hard block legacy payloads so we don’t silently “do nothing”
  if (body?.revenue_type || body?.raw_item_name || body?.kind || body?.apply_to_future) {
    return NextResponse.json(
      {
        error:
          "Legacy classify payload detected. Send { sales_event_id, category, product_id?, ignored? }",
      },
      { status: 400 }
    );
  }

  const { sales_event_id, category, product_id = null, ignored = false } = body;

  if (!sales_event_id || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1) delete existing
  const del = await supabase
    .from("sales_classifications")
    .delete()
    .eq("sales_event_id", sales_event_id);

  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  // 2) insert new
  const ins = await supabase
    .from("sales_classifications")
    .insert({
      sales_event_id,
      category,
      product_id,
      ignored,
      classified_by: "manual",
    });

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
