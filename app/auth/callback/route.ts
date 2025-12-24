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
     Verify authenticated user exists
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
     ENFORCEMENT POINT
     Delegate provisioning decision to /api/me
  -------------------------------------------------- */
  const meRes = await fetch(`${url.origin}/api/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const me = await meRes.json();

  if (me?.needsSignup) {
    console.log("🚧 OAuth user needs signup → redirecting");
    return NextResponse.redirect(new URL("/sign-up", url));
  }

  /* --------------------------------------------------
     FINAL redirect — user is provisioned
  -------------------------------------------------- */
  return NextResponse.redirect(new URL(callbackURL, url));
}
