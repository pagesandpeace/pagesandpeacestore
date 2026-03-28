export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

type GoogleMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const callbackURL = url.searchParams.get("callbackURL") || "/dashboard";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) =>
            cookieStore.set(c.name, c.value, c.options)
          );
        },
      },
    }
  );

  /* -------------------------
     AUTH FLOW
  ------------------------- */
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ OAuth exchange failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "recovery",
    });
    if (error) {
      console.error("❌ verifyOtp failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* -------------------------
     GET USER
  ------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as GoogleMetadata) || {};

  /* -------------------------
     CHECK EXISTING USER
  ------------------------- */
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, marketing_consent")
    .eq("email", email)
    .maybeSingle();

  /* -------------------------
     EXISTING USER FLOW
  ------------------------- */
  if (existingUser) {
    if (existingUser.auth_user_id !== user.id) {
      await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);
    }

    /* ✅ ONLY SYNC IF CONSENT */
    if (existingUser.marketing_consent) {
      try {
        await fetch(
          `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              reactivate_existing: true,
              send_welcome_email: false,
              utm_source: "existing_user_login",
              referring_site: "pages_and_peace",
            }),
          }
        );
      } catch (err) {
        console.error("⚠️ Beehiiv sync failed (existing):", err);
      }
    } else {
      console.log("ℹ️ Existing user has no consent — skipping Beehiiv");
    }

    return NextResponse.redirect(new URL(callbackURL, url));
  }

  /* -------------------------
     NEW USER CREATION (GOOGLE)
  ------------------------- */
  const now = new Date().toISOString();

  await supabaseAdmin.from("users").insert({
    id: crypto.randomUUID(),
    email,
    auth_user_id: user.id,
    name: meta.full_name || meta.name || email,
    image: meta.avatar_url || meta.picture || null,
    role: "customer",
    auth_provider: user.app_metadata?.provider || "google",
    email_verified: true,
    created_at: now,

    // ✅ CONSENT STORED (IMPLICIT VIA GOOGLE DISCLOSURE)
    marketing_consent: true,
    marketing_consent_at: now,
  });

  /* -------------------------
     BEEHIIV SUBSCRIBE (NEW USER)
  ------------------------- */
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
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "google_signup",
          utm_medium: "oauth",
          referring_site: "pages_and_peace",
          custom_fields: [
            {
              name: "name",
              value: meta.full_name || meta.name || "",
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("⚠️ Beehiiv error (new user):", err);
    } else {
      console.log("✅ Beehiiv subscription success (new user)");
    }
  } catch (err) {
    console.error("⚠️ Beehiiv request failed (new user):", err);
  }

  return NextResponse.redirect(new URL(callbackURL, url));
}