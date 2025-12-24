import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const callbackURL = url.searchParams.get("callbackURL") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const cookieStore = await cookies();

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
    console.error("❌ getUser failed after OAuth:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  console.log("👤 OAuth user authenticated:", user.id);

  /* --------------------------------------------------
     🔒 HARD ENFORCEMENT (NO HTTP, NO RACE CONDITIONS)
     Does a users row exist?
  -------------------------------------------------- */
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("❌ users lookup failed:", profileErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  if (!profile) {
    console.log("🚧 No profile → redirecting to /sign-up");
    return NextResponse.redirect(new URL("/sign-up", url));
  }

  /* --------------------------------------------------
     Profile exists → proceed
  -------------------------------------------------- */
  return NextResponse.redirect(new URL(callbackURL, url));
}
