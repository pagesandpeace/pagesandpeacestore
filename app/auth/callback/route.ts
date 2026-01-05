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
        setAll: (cookies) => {
          cookies.forEach((cookie) =>
            cookieStore.set(cookie.name, cookie.value, cookie.options)
          );
        },
      },
    }
  );

  /* --------------------------------------------------
     Supabase SERVICE ROLE client (bypass RLS)
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
     Get authenticated user
  -------------------------------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     UPSERT PROFILE (IDEMPOTENT, RACE-SAFE)
  -------------------------------------------------- */
  const meta = (user.user_metadata as GoogleMetadata) || {};

  const { error: upsertErr } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        auth_user_id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || user.email,
        image: meta.avatar_url || meta.picture || null,
        role: "customer",
        auth_provider: "google",
      },
      {
        onConflict: "auth_user_id",
      }
    );

  if (upsertErr) {
    console.error("❌ Failed to upsert user profile:", upsertErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  /* --------------------------------------------------
     Done
  -------------------------------------------------- */
  return NextResponse.redirect(new URL(callbackURL, url));
}
