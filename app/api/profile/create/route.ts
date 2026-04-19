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
     🔐 AUTH
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

  // ✅ Provider (robust)
  const provider =
    auth.user.app_metadata?.provider ||
    auth.user.identities?.[0]?.provider ||
    "email";

  console.log("🧪 AUTH PROVIDER:", provider);

  /* -------------------------
     BODY
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
  ------------------------- */
  const payload: UserInsert = {
    auth_user_id: authUserId,
    email,
    name: body.name || email,
    image: null,
    role: "customer",
    auth_provider: provider,
  };

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
     BEEHIIV SYNC (SILENT)
  ------------------------- */
  if (hasConsent) {
    try {
      const beehiivPayload = {
        email,
        reactivate_existing: true,

        // 🔥 FIX: prevent duplicate welcome emails
        send_welcome_email: false,

        utm_source: "app_signup",
        referring_site: "pages_and_peace",
        custom_fields: [
          {
            name: "name",
            value: body.name || "",
          },
        ],
      };

      console.log("📤 Beehiiv payload:", beehiivPayload);

      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(beehiivPayload),
        }
      );

      const text = await res.text();

      console.log("📥 Beehiiv status:", res.status);
      console.log("📥 Beehiiv response:", text);

      if (res.ok) {
        console.log("✅ Beehiiv sync success");

        // ✅ Keep DB consistent (same as callback)
        await supabaseAdmin
          .from("users")
          .update({
            beehiiv_subscribed: true,
            beehiiv_subscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .ilike("email", email); // 🔥 slightly safer than eq

        console.log("⚡ Optimistic DB update applied");
      } else {
        console.error("⚠️ Beehiiv error");
      }
    } catch (err) {
      console.error("⚠️ Beehiiv request failed:", err);
    }
  } else {
    console.log("ℹ️ No marketing consent — skipping Beehiiv");
  }

  return NextResponse.json({ ok: true });
}