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
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  picture?: string;
  marketing_consent?: boolean;
};

export async function GET(request: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔥 AUTH CALLBACK START");

  const url = new URL(request.url);
  const cookieStore = await cookies();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const intent = url.searchParams.get("intent");

  const marketingFromURL =
    url.searchParams.get("marketing_consent") === "true";

  console.log("📥 PARAMS:", {
    code,
    tokenHash,
    type,
    intent,
    marketingFromURL,
  });

  /* -------------------------
     SAFE REDIRECT
  ------------------------- */
  const allowedPaths = [
    "/dashboard",
    "/admin",
    "/account",
    "/reset-password",
  ];

  const rawCallback = url.searchParams.get("callbackURL") || "/dashboard";

  let callbackURL = allowedPaths.includes(rawCallback)
    ? rawCallback
    : "/dashboard";

  // Password recovery links should not land on dashboard.
  // They should land on a page where the user can set a new password.
  if (type === "recovery") {
    callbackURL = "/reset-password";
  }

  console.log("🔁 Redirect:", callbackURL);

  /* -------------------------
     SUPABASE CLIENT
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
     GET AUTH USER
  ------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  console.log("👤 AUTH USER RAW:", user);

  if (userErr || !user || !user.email) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as Meta) || {};

  console.log("📧 Email:", email);
  console.log("📊 Metadata:", meta);
  console.log("🕒 Auth created_at:", user.created_at);

  const fullName =
    meta.full_name ||
    meta.name ||
    `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
    email.split("@")[0];

  const marketingConsent =
    meta.marketing_consent === true || marketingFromURL;

  console.log("👤 Final name:", fullName);
  console.log("📊 Marketing consent:", marketingConsent);

  /* -------------------------
     ADMIN CLIENT
  ------------------------- */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date().toISOString();
  const firstSend = user.created_at;

  console.log("🧪 USING firstSend:", firstSend);

  /* -------------------------
     FIND USER PROFILE
  ------------------------- */
  let existing = null;

  const { data: existingByAuthId, error: existingByAuthIdErr } =
    await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (existingByAuthIdErr) {
    console.error("❌ Existing user lookup by auth_user_id failed:", existingByAuthIdErr);
  }

  existing = existingByAuthId;

  // Fallback: if profile exists by email but auth_user_id is missing/wrong,
  // recover it instead of sending user to sign-up.
  if (!existing) {
    const { data: existingByEmail, error: existingByEmailErr } =
      await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (existingByEmailErr) {
      console.error("❌ Existing user lookup by email failed:", existingByEmailErr);
    }

    existing = existingByEmail;

    if (existing && existing.auth_user_id !== user.id) {
      console.log("🩹 Repairing auth_user_id on existing email profile");

      const { error: repairErr } = await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: user.id,
          updated_at: now,
        })
        .eq("id", existing.id);

      if (repairErr) {
        console.error("❌ Failed to repair auth_user_id:", repairErr);
      } else {
        existing.auth_user_id = user.id;
        console.log("✅ Repaired auth_user_id");
      }
    }
  }

  console.log("📦 Existing user:", existing);

  let created = false;

  /* -------------------------
     CREATE USER PROFILE IF NEEDED
  ------------------------- */
  if (!existing) {
    console.log("🆕 Creating REAL user profile");

    const { error } = await supabaseAdmin.from("users").insert({
      id: crypto.randomUUID(),
      email,
      auth_user_id: user.id,
      name: fullName,
      image: meta.avatar_url || meta.picture || null,
      role: "customer",
      auth_provider: user.app_metadata?.provider || "email",
      email_verified: true,
      created_at: now,
      signup_status: "active",

      marketing_consent: null,
      marketing_consent_at: null,

      first_magic_link_sent_at: firstSend,
      last_magic_link_sent_at: firstSend,
      magic_link_send_count: 1,

      first_login_at: now,
      last_login_at: now,
      last_seen_at: now,
      last_magic_link_clicked_at: now,
      has_logged_in: true,
    });

    if (error) {
      console.error("❌ Insert failed:", error);
      return NextResponse.redirect(
        new URL("/sign-in?error=profile_setup_failed", url)
      );
    }

    created = true;
    console.log("✅ User created");
  } else {
    console.log("ℹ️ Updating existing user");

    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        auth_user_id: user.id,

        first_magic_link_sent_at:
          existing.first_magic_link_sent_at || firstSend,
        last_magic_link_sent_at:
          existing.last_magic_link_sent_at || firstSend,
        magic_link_send_count:
          existing.magic_link_send_count || 1,

        first_login_at: existing.first_login_at || now,
        last_login_at: now,
        last_seen_at: now,
        last_magic_link_clicked_at: now,
        has_logged_in: true,
        signup_status: "active",

        updated_at: now,
      })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("❌ UPDATE FAILED:", updateErr);
    } else {
      console.log("✅ UPDATE SUCCESS");
    }
  }

  /* -------------------------
     BEEHIIV
  ------------------------- */
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (publicationId && apiKey && marketingConsent) {
    try {
      console.log("📬 Subscribing to Beehiiv...");

      const payload = {
        email,
        reactivate_existing: true,
        send_welcome_email: created,
      };

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

      console.log("📬 Beehiiv status:", res.status);

      if (res.ok) {
        await supabaseAdmin
          .from("users")
          .update({
            beehiiv_subscribed: true,
            beehiiv_subscribed_at: now,
            updated_at: now,
          })
          .eq("auth_user_id", user.id);

        console.log("✅ Beehiiv subscribed");
      } else {
        console.error("❌ Beehiiv failed");
      }
    } catch (err) {
      console.error("❌ Beehiiv crash:", err);
    }
  }

  console.log("✅ CALLBACK COMPLETE", {
    userId: user.id,
    email,
    existingUserId: existing?.id,
    created,
    intent,
    type,
    callbackURL,
  });

  console.log("➡️ Redirecting:", callbackURL);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return NextResponse.redirect(new URL(callbackURL, url));
}