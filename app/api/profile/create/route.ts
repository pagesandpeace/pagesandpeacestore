export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const auth = await supabaseAuthServer();
  const { data } = await auth.auth.getUser();
  const user = data.user;
  if (!user || !user.email) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

  const body = await req.json();
  const email = user.email.toLowerCase();
  const now = new Date().toISOString();
  const hasConsent = body.marketing_consent === true;
  const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || "email";
  const db = supabaseService().schema("app_core");

  const { error } = await db.from("customers").upsert({
    auth_user_id: user.id,
    email,
    display_name: body.name || email,
    profile_image: null,
    auth_provider: provider,
    email_verified: Boolean(user.email_confirmed_at),
    signup_status: "active",
    marketing_consent: hasConsent,
    marketing_consent_at: hasConsent ? now : null,
    updated_at: now,
  }, { onConflict: "auth_user_id" });

  if (error) {
    console.error("Profile create failed", error.message);
    return NextResponse.json({ error: "PROFILE_CREATE_FAILED" }, { status: 400 });
  }

  if (hasConsent && process.env.BEEHIIV_PUBLICATION_ID && process.env.BEEHIIV_API_KEY) {
    try {
      const res = await fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: "app_signup",
          referring_site: "pages_and_peace",
          custom_fields: [{ name: "name", value: body.name || "" }],
        }),
      });
      if (res.ok) {
        await db.from("customers").update({
          beehiiv_subscribed: true,
          beehiiv_subscribed_at: now,
          updated_at: now,
        }).eq("auth_user_id", user.id);
      }
    } catch (err) {
      console.error("Beehiiv request failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
