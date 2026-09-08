export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const auth = await supabaseAuthServer();
    const { data: { user }, error: authErr } = await auth.auth.getUser();
    if (authErr || !user) return NextResponse.json(null, { status: 401 });

    const db = supabaseService().schema("app_core");
    const { data: profile, error } = await db.from("customers")
      .select("auth_user_id,email,display_name,profile_image,marketing_consent,beehiiv_subscribed")
      .eq("auth_user_id", user.id).single();
    if (error || !profile) return NextResponse.json(null, { status: 500 });

    const { data: admin } = await db.from("admins").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle();
    return NextResponse.json({
      id: profile.auth_user_id,
      email: profile.email,
      name: profile.display_name ?? "",
      image: profile.profile_image ?? null,
      role: admin ? "admin" : "customer",
      marketingConsent: profile.marketing_consent === true,
      beehiivSubscribed: profile.beehiiv_subscribed === true,
    });
  } catch {
    console.error("/api/me failed");
    return NextResponse.json(null, { status: 500 });
  }
}
