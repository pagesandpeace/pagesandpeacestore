import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabaseAdmin.from("users").insert({
    auth_user_id: body.auth_user_id,
    email: body.email,
    name: body.name,
    image: null,
    role: "customer",
    auth_provider: "credentials",
  });

  if (error) {
    console.error("❌ Profile create failed:", error);
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
