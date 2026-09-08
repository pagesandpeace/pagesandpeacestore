export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function PATCH(req: Request) {
  try {
    const auth = await supabaseAuthServer();
    const { data: { user }, error: authErr } = await auth.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = body?.name?.toString().trim();
    if (!name || name.length < 2) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

    const { data, error } = await supabaseService().schema("app_core").from("customers")
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq("auth_user_id", user.id)
      .select("display_name")
      .single();

    if (error || !data) return NextResponse.json({ error: "Name not persisted" }, { status: 500 });
    return NextResponse.json({ success: true, name: data.display_name });
  } catch {
    return NextResponse.json({ error: "Name update failed" }, { status: 500 });
  }
}
