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

  console.log("📥 PARAMS:", { code, tokenHash, type });

  /* -------------------------
     SAFE CALLBACK URL
  ------------------------- */
  const allowedPaths = ["/dashboard", "/admin", "/account"];
  const rawCallback = url.searchParams.get("callbackURL") || "/dashboard";

  const callbackURL = allowedPaths.includes(rawCallback)
    ? rawCallback
    : "/dashboard";

  console.log("🔁 REDIRECT TARGET:", callbackURL);

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
    console.log("🔑 OAuth flow (code)");
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("❌ exchangeCodeForSession failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else if (tokenHash && type) {
    console.log("🔑 OTP flow:", type);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "magiclink" | "recovery", // ✅ FIXED
    });

    if (error) {
      console.error("❌ verifyOtp failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  } else {
    console.log("⚠️ No auth params");
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* -------------------------
     GET USER
  ------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  console.log("👤 USER AFTER AUTH:", user?.id, user?.email);

  if (userErr || !user || !user.email) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* -------------------------
     ADMIN CLIENT
  ------------------------- */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as Meta) || {};

  /* -------------------------
     CHECK EXISTING USER
  ------------------------- */
  const { data: existingUser, error: existingErr } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  console.log("🔍 EXISTING USER:", existingUser, existingErr);

  /* -------------------------
     CREATE USER (IDEMPOTENT)
  ------------------------- */
  if (!existingUser) {
    console.log("🆕 CREATING USER...");

    const now = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email,
        auth_user_id: user.id,
        name: meta.full_name || meta.name || email,
        image: meta.avatar_url || meta.picture || null,
        role: "customer",
        auth_provider: user.app_metadata?.provider || "email",
        email_verified: true,
        created_at: now,
        marketing_consent: true,
        marketing_consent_at: now,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("❌ USER INSERT FAILED:", insertErr);
    } else {
      console.log("✅ USER CREATED");
    }
  } else {
    console.log("✅ USER ALREADY EXISTS");
  }

  console.log("🚀 REDIRECTING:", callbackURL);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return NextResponse.redirect(new URL(callbackURL, url));
}