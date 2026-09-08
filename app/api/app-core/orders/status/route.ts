import { NextResponse } from "next/server";

import { appCoreDb } from "@/lib/app-core/service";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const { data, error } = await appCoreDb()
    .from("orders")
    .select("id, status, total_pence, currency, paid_at")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ order: data }, { headers: { "Cache-Control": "no-store" } });
}
