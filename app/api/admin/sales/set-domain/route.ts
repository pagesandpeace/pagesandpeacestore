import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_DOMAINS = [
  "drink",
  "food",
  "retail_book",
  "retail_merch",
  "event",
  "custom_amount",
  "unknown",
];

export async function POST(req: Request) {
  const { sale_id, domain } = await req.json();

  if (!sale_id || !ALLOWED_DOMAINS.includes(domain)) {
    return NextResponse.json(
      { error: "Invalid sale_id or domain" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("shop_sales_items")
    .update({ domain })
    .eq("id", sale_id);

  if (error) {
    console.error("❌ Failed to set domain", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
