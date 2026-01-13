export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  id: string;
  quantity: number;
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

    if (!body.id || body.quantity < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("customer_backorders")
      .update({ quantity: body.quantity })
      .eq("id", body.id)
      .eq("status", "awaiting_order"); // hard safety

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ quantity update failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
