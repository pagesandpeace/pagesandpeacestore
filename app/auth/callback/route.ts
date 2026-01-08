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

  /* --------------------------------------------------
     OAUTH FLOW (Google)
  -------------------------------------------------- */
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("❌ OAuth exchange failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  }

  /* --------------------------------------------------
     MAGIC LINK / RECOVERY FLOW
  -------------------------------------------------- */
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "recovery",
    });

    if (error) {
      console.error("❌ verifyOtp failed:", error);
      return NextResponse.redirect(new URL("/sign-in", url));
    }
  }

  else {
    // No valid auth params
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     SESSION MUST EXIST NOW
  -------------------------------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     CANONICAL USER LINKING (unchanged)
  -------------------------------------------------- */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as GoogleMetadata) || {};

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

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

    return NextResponse.redirect(new URL(callbackURL, url));
  }

  await supabaseAdmin.from("users").insert({
    id: crypto.randomUUID(),
    email,
    auth_user_id: user.id,
    name: meta.full_name || meta.name || email,
    image: meta.avatar_url || meta.picture || null,
    role: "customer",
    auth_provider: user.app_metadata?.provider || "email",
    email_verified: true,
    created_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL(callbackURL, url));
}
