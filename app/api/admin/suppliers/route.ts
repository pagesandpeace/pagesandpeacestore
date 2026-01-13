export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profileError) {
      console.error("❌ profile lookup failed", profileError);
      return NextResponse.json(
        { error: "Profile lookup failed" },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       FETCH SUPPLIERS
    ------------------------- */
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ suppliers fetch failed", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("🔥 suppliers route crashed", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
