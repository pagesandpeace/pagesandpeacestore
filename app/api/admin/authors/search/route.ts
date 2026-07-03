import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET(req: Request) {
  try {
    /* --------------------------------------------------
       1) Require admin
    -------------------------------------------------- */
    const { supabase, error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /* --------------------------------------------------
       2) Read search query
    -------------------------------------------------- */
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const query = supabase
      .from("authors")
      .select("id, name")
      .order("name")
      .limit(10);

    if (q) {
      query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("🔥 Author search route crashed:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}