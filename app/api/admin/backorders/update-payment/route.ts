export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  id: string;
  payment_status: "unpaid" | "paid";
};

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const body: Body = await req.json();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const { error } = await supabase
      .from("customer_backorders")
      .update({
        payment_status: body.payment_status,
      })
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ payment update failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
