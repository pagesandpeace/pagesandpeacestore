import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
  const intent = url.searchParams.get("intent");

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
     Load authenticated user
  -------------------------------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.error("❌ getUser failed:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  console.log("👤 OAuth user:", user.id);

  /* --------------------------------------------------
     Check for existing profile
  -------------------------------------------------- */
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  /* --------------------------------------------------
     🟢 GOOGLE SIGN-UP: CREATE PROFILE ONCE
  -------------------------------------------------- */
  if (intent === "signup" && !profile) {
    console.log("🟢 Google signup → creating profile");

    const meta = (user.user_metadata as GoogleMetadata) || {};
    const displayName =
      meta.full_name || meta.name || user.email || "";
    const avatar =
      meta.avatar_url || meta.picture || null;

    const { error: insertErr } = await supabase.from("users").insert({
      auth_user_id: user.id,
      email: user.email,
      name: displayName,
      image: avatar,
      role: "customer",
      auth_provider: "google",
    });

    if (insertErr) {
      console.error("❌ Profile creation failed:", insertErr);
      return NextResponse.redirect(new URL("/sign-in", url));
    }

    return NextResponse.redirect(new URL(callbackURL, url));
  }

  /* --------------------------------------------------
     🔒 GOOGLE SIGN-IN: ENFORCE PROFILE
  -------------------------------------------------- */
  if (!profile) {
    console.log("🚧 No profile → redirecting to /sign-up");
    return NextResponse.redirect(new URL("/sign-up", url));
  }

  /* --------------------------------------------------
     Profile exists → proceed
  -------------------------------------------------- */
  return NextResponse.redirect(new URL(callbackURL, url));
}
