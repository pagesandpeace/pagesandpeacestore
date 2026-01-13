export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await supabaseServer();

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

    const { data, error } = await supabase
      .from("stock_movements")
      .select("change, reason, user_id, created_at")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load stock movements" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
