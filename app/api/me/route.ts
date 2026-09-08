export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(null, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, name, image, role, marketing_consent, beehiiv_subscribed")
      .eq("auth_user_id", user.id)
      .single();

    if (profileErr || !profile) {
      console.error("Authenticated user profile lookup failed", { userId: user.id });
      return NextResponse.json(null, { status: 500 });
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name ?? "",
      image: profile.image ?? null,
      role: profile.role ?? "customer",
      marketingConsent: profile.marketing_consent === true,
      beehiivSubscribed: profile.beehiiv_subscribed === true,
    });
  } catch {
    console.error("/api/me failed");
    return NextResponse.json(null, { status: 500 });
  }
}
