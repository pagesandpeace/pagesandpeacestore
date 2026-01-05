import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type GoogleMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const callbackURL = url.searchParams.get("callbackURL") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const cookieStore = await cookies();

  /* --------------------------------------------------
     Supabase SERVER client (auth + cookies)
  -------------------------------------------------- */
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
     Supabase SERVICE ROLE (bypass RLS)
  -------------------------------------------------- */
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* --------------------------------------------------
     Exchange OAuth code → session
  -------------------------------------------------- */
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("❌ OAuth exchange failed:", exchangeError);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     Get authenticated auth user
  -------------------------------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const email = user.email.toLowerCase();
  const meta = (user.user_metadata as GoogleMetadata) || {};

  /* --------------------------------------------------
     EMAIL-FIRST USER LOOKUP (CANONICAL STEP)
  -------------------------------------------------- */
  const { data: existingUser, error: lookupErr } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (lookupErr) {
    console.error("❌ users email lookup failed:", lookupErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     CASE 1: User exists → reattach auth_user_id
  -------------------------------------------------- */
  if (existingUser) {
    if (existingUser.auth_user_id !== user.id) {
      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: user.id,
          auth_provider: "google",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateErr) {
        console.error("❌ Failed to reattach auth_user_id:", updateErr);
        return NextResponse.redirect(new URL("/sign-in", url));
      }
    }

    return NextResponse.redirect(new URL(callbackURL, url));
  }

  /* --------------------------------------------------
     CASE 2: No user → create new canonical user
  -------------------------------------------------- */
  const { error: insertErr } = await supabaseAdmin.from("users").insert({
    id: crypto.randomUUID(),
    email,
    auth_user_id: user.id,
    name: meta.full_name || meta.name || email,
    image: meta.avatar_url || meta.picture || null,
    role: "customer",
    auth_provider: "google",
    email_verified: true,
    created_at: new Date().toISOString(),
  });

  if (insertErr) {
    console.error("❌ Failed to create user profile:", insertErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  return NextResponse.redirect(new URL(callbackURL, url));
}
