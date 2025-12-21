import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("STORE LIST ERROR:", error);
    return NextResponse.json({ error: "Failed to load stores" }, { status: 500 });
  }

  return NextResponse.json(data);
}
