export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { completeAuthenticatedUser } from "@/lib/auth/complete-auth";

const allowedPaths = new Set(["/dashboard", "/admin", "/account", "/reset-password"]);
const otpTypes = new Set(["magiclink", "signup", "recovery"]);
function signInRedirect(request: Request, reason: string) { const url = new URL("/sign-in", request.url); url.searchParams.set("reason", reason); return NextResponse.redirect(url, 303); }

/** OAuth/PKCE callback. A magic-link GET only redirects to a deliberate POST confirmation. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code"); const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); const intent = url.searchParams.get("intent"); const callbackURL = url.searchParams.get("callbackURL");
  if (!code && tokenHash && type && otpTypes.has(type)) {
    const confirm = new URL("/auth/confirm", request.url);
    confirm.searchParams.set("token_hash", tokenHash); confirm.searchParams.set("type", type);
    if (intent) confirm.searchParams.set("intent", intent);
    if (callbackURL) confirm.searchParams.set("callbackURL", callbackURL);
    if (url.searchParams.get("marketing_consent") === "true") confirm.searchParams.set("marketing_consent", "true");
    return NextResponse.redirect(confirm, 303);
  }
  if (!code) return signInRedirect(request, "invalid-link");
  const destination = callbackURL && allowedPaths.has(callbackURL) ? callbackURL : "/dashboard";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.headers.get("cookie")?.split(/;\s*/).filter(Boolean).map((entry) => { const i = entry.indexOf("="); return { name: entry.slice(0, i), value: entry.slice(i + 1) }; }) ?? [], setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return signInRedirect(request, "sign-in-failed");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return signInRedirect(request, "sign-in-failed");
  const consent = intent === "signup" && url.searchParams.get("marketing_consent") === "true";
  const complete = await completeAuthenticatedUser(user, { allowMarketingConsent: consent });
  if (!complete.ok) return signInRedirect(request, "profile-setup-failed");
  return response;
}
