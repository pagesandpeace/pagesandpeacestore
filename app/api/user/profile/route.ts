import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const newName = body.name?.toString().trim();

  if (!newName || newName.length < 2) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", auth.user.id);

  if (error) {
    console.error("❌ Name update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
