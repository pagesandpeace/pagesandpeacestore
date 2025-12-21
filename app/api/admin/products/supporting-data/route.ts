import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  const [vibes, themes, genres] = await Promise.all([
    supabase.from("vibes").select("id, name").order("name"),
    supabase.from("themes").select("id, name").order("name"),
    supabase.from("genres").select("id, name").order("name"),
  ]);

  return NextResponse.json({
    vibes: vibes.data || [],
    themes: themes.data || [],
    genres: genres.data || [],
  });
}
