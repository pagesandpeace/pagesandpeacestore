export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

type Meta = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
};

export async function GET(request: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔥 AUTH CALLBACK START");

  const url = new URL(request.url);
  const cookieStore = await cookies();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  /* -------------------------
     SAFE REDIRECT
  ------------------------- */
  const allowedPaths = ["/dashboard", "/admin", "/account"];
  const rawCallback = url.searchParams.get("callbackURL") || "/dashboard";

  const callbackURL = allowedPaths.includes(rawCallback)
    ? rawCallback
    : "/dashboard";

  console.log("🔁 Redirect:", callbackURL);

  /* -------------------------
     CLIENT
  ------------------------- */
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
    console.log("🔑 OAuth flow");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ OAuth exchange failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else if (tokenHash && type) {
    console.log("🔑 OTP flow:", type);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "magiclink" | "recovery",
    });
    if (error) {
      console.error("❌ verifyOtp failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else {
    console.warn("⚠️ No auth params");
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

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as Meta) || {};

  console.log("👤 USER:", email);
  console.log("🧪 PROVIDER:", user.app_metadata?.provider);

  /* -------------------------
     ADMIN CLIENT
  ------------------------- */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* -------------------------
     CHECK EXISTING USER
  ------------------------- */
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  console.log("🧠 EXISTING USER:", existing);

  const now = new Date().toISOString();
  const consent = true;

  /* -------------------------
     CREATE OR UPDATE USER
  ------------------------- */
  let created = false;

  if (!existing) {
    console.log("🆕 Creating user");

    const { error } = await supabaseAdmin.from("users").insert({
      id: crypto.randomUUID(),
      email,
      auth_user_id: user.id,
      name: meta.full_name || meta.name || email.split("@")[0],
      image: meta.avatar_url || meta.picture || null,
      role: "customer",
      auth_provider: user.app_metadata?.provider || "email", // ✅ keep dynamic
      email_verified: true,
      created_at: now,
      marketing_consent: true,
      marketing_consent_at: now,
      signup_status: "complete",
    });

    if (error) {
      console.error("❌ Insert failed:", error);
    } else {
      created = true;
      console.log("✅ User created");
    }
  } else {
    console.log("ℹ️ Existing user");

    if (existing.auth_user_id !== user.id) {
      await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: user.id,
          updated_at: now,
        })
        .eq("id", existing.id);
    }
  }

  /* -------------------------
     BEEHIIV SYNC
  ------------------------- */
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (consent) {
    try {
      const payload = {
        email,
        reactivate_existing: true,
        send_welcome_email: created,
      };

      console.log("📤 Beehiiv payload:", payload);

      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();

      console.log("📥 Beehiiv status:", res.status);
      console.log("📥 Beehiiv response:", text);

      if (res.ok) {
        console.log("✅ Beehiiv success");

        /* 🔥 CRITICAL FIX — optimistic DB update */
        await supabaseAdmin
          .from("users")
          .update({
            beehiiv_subscribed: true,
            beehiiv_subscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);

        console.log("⚡ Optimistic DB update applied");
      } else {
        console.error("❌ Beehiiv failed");
      }
    } catch (err) {
      console.error("❌ Beehiiv crash:", err);
    }
  }

  console.log("➡️ Redirecting:", callbackURL);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return NextResponse.redirect(new URL(callbackURL, url));
}