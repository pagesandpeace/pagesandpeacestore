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

  // Optional intent flags (safe to keep)
  const joinLoyalty = url.searchParams.get("join") === "loyalty";

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
    console.error("❌ getUser failed after OAuth:", userErr);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  console.log("👤 OAuth user:", user.id);

  /* --------------------------------------------------
     Extract Google metadata (safe, non-blocking)
  -------------------------------------------------- */
  const meta = (user.user_metadata as GoogleMetadata) || {};

  const displayName =
    meta.full_name || meta.name || user.email || "";

  const avatar =
    meta.avatar_url || meta.picture || null;

  /* --------------------------------------------------
     Ensure public.users row exists (idempotent)
     JOIN VIA auth_user_id (IMPORTANT)
  -------------------------------------------------- */
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await supabase.from("users").insert({
      auth_user_id: user.id,
      email: user.email,
      name: displayName,
      image: avatar,
      role: "customer",
    });

    if (insertErr) {
      console.error("❌ users insert failed:", insertErr);
    } else {
      console.log("✅ Created public.users profile");
    }
  }

  /* --------------------------------------------------
     Optional: loyalty auto-opt-in (idempotent)
  -------------------------------------------------- */
  if (joinLoyalty) {
    const { error: loyaltyErr } = await supabase
      .from("loyalty_members")
      .insert({
        user_id: user.id,
        status: "active",
        tier: "starter",
        marketing_consent: false,
        terms_version: "v1.0",
      });

    if (loyaltyErr && loyaltyErr.code !== "23505") {
      console.error("❌ Loyalty opt-in failed:", loyaltyErr);
    }
  }

  /* --------------------------------------------------
     FINAL redirect — NO role logic here
  -------------------------------------------------- */
  return NextResponse.redirect(new URL(callbackURL, url));
}
