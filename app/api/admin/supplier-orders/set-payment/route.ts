import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  const {
    backorder_id,
    payment_status,
    payment_reference,
  } = await req.json();

  if (!backorder_id) {
    return NextResponse.json(
      { error: "Missing backorder_id" },
      { status: 400 }
    );
  }

  if (!["paid", "unpaid"].includes(payment_status)) {
    return NextResponse.json(
      { error: "Invalid payment_status" },
      { status: 400 }
    );
  }

  if (payment_status === "paid" && !payment_reference) {
    return NextResponse.json(
      { error: "Payment reference required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("customer_backorders")
    .update({
      payment_status,
      payment_reference:
        payment_status === "paid"
          ? payment_reference
          : null,
    })
    .eq("id", backorder_id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
