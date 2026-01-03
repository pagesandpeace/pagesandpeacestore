export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const supabase = await supabaseServer();

  const { error } = await supabase.rpc(
    "mark_supplier_order_ordered",
    { p_order_id: orderId }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
