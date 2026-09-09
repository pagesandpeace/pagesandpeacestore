export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { completeAuthenticatedUser } from "@/lib/auth/complete-auth";

const allowedPaths = new Set(["/dashboard", "/admin", "/account", "/reset-password", "/events/checkout"]);
const validTypes = new Set(["magiclink", "signup", "recovery"]);
function signInRedirect(request: Request, reason: string) { const url = new URL("/sign-in", request.url); url.searchParams.set("reason", reason); return NextResponse.redirect(url, 303); }

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? ""); const type = String(form.get("type") ?? "");
  const requestedPath = String(form.get("callbackURL") ?? "/dashboard");
  if (!tokenHash || !validTypes.has(type)) return signInRedirect(request, "invalid-link");
  const destination = type === "recovery" ? "/reset-password" : allowedPaths.has(requestedPath) ? requestedPath : "/dashboard";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.headers.get("cookie")?.split(/;\s*/).filter(Boolean).map((entry) => { const i = entry.indexOf("="); return { name: entry.slice(0, i), value: entry.slice(i + 1) }; }) ?? [], setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "magiclink" | "signup" | "recovery" });
  if (error) return signInRedirect(request, "link-expired-or-used");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return signInRedirect(request, "sign-in-failed");
  const consent = form.get("marketing_consent") === "true";
  const complete = await completeAuthenticatedUser(user, { allowMarketingConsent: consent });
  if (!complete.ok) return signInRedirect(request, "profile-setup-failed");
  return response;
}
