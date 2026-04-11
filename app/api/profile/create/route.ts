export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

type UserInsert = {
  auth_user_id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  auth_provider: string;
  marketing_consent?: boolean;
  marketing_consent_at?: string;
};

export async function POST(req: Request) {
  /* -------------------------
     🔐 AUTH (CRITICAL FIX)
  ------------------------- */
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user || !auth.user.email) {
    return NextResponse.json(
      { error: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  const authUserId = auth.user.id;
  const email = auth.user.email.toLowerCase();

  /* -------------------------
     BODY (SAFE TO READ NOW)
  ------------------------- */
  const body = await req.json();
  const hasConsent = !!body.marketing_consent;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* -------------------------
     BUILD UPSERT PAYLOAD
     ✅ AUTH DATA FROM SESSION ONLY
  ------------------------- */
  const payload: UserInsert = {
    auth_user_id: authUserId, // 🔐 FIXED
    email: email,             // 🔐 FIXED
    name: body.name || email,
    image: null,
    role: "customer",
    auth_provider: "credentials",
  };

  // ✅ ONLY set consent if TRUE (never overwrite to false)
  if (hasConsent) {
    payload.marketing_consent = true;
    payload.marketing_consent_at = new Date().toISOString();
  }

  /* -------------------------
     UPSERT USER
  ------------------------- */
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(payload, {
      onConflict: "email",
    });

  if (error) {
    console.error("❌ Profile create failed:", error);
    return NextResponse.json({ error }, { status: 400 });
  }

  /* -------------------------
     BEEHIIV SUBSCRIBE (ONLY IF CONSENT)
     ✅ USE VERIFIED EMAIL
  ------------------------- */
  if (hasConsent) {
    try {
      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email, // 🔐 FIXED (was body.email)
            reactivate_existing: true,
            send_welcome_email: true,
            utm_source: "app_signup",
            referring_site: "pages_and_peace",
            custom_fields: [
              {
                name: "name",
                value: body.name || "",
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        console.error("⚠️ Beehiiv error:", err);
      } else {
        console.log("✅ Beehiiv subscription success");
      }
    } catch (err) {
      console.error("⚠️ Beehiiv request failed:", err);
    }
  } else {
    console.log("ℹ️ User did not consent to marketing — skipping Beehiiv");
  }

  return NextResponse.json({ ok: true });
}