import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET(req: Request) {
  try {
    /* --------------------------------------------------
       1) Require admin before using service role
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /* --------------------------------------------------
       2) Read query params
    -------------------------------------------------- */
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing author id" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       3) Use service role only after admin check
    -------------------------------------------------- */
    const supabase = supabaseService();

    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("🔥 Get author route crashed:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}