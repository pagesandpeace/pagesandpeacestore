import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appCoreDb } from "@/lib/app-core/service";

export const runtime = "nodejs";

const allowedPaths = new Set(["/dashboard", "/admin", "/account", "/reset-password"]);
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const genericSuccess = () => NextResponse.json({ success: true });

export async function POST(request: Request) {
  let body: { email?: unknown; callbackURL?: unknown; intent?: unknown; name?: unknown; firstName?: unknown; lastName?: unknown; marketingConsent?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return genericSuccess();

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const db = appCoreDb();
  const [emailLimit, ipLimit] = await Promise.all([
    db.rpc("consume_auth_rate_limit", { p_bucket: `email:${hash(email)}`, p_limit: 3, p_window_seconds: 900 }).single(),
    db.rpc("consume_auth_rate_limit", { p_bucket: `ip:${hash(forwarded)}`, p_limit: 10, p_window_seconds: 3600 }).single(),
  ]);
  if (emailLimit.error || ipLimit.error || emailLimit.data !== true || ipLimit.data !== true) return genericSuccess();

  const intent = body.intent === "join" || body.intent === "signup" ? "join" : "signin";
  const callbackURL = typeof body.callbackURL === "string" && allowedPaths.has(body.callbackURL) ? body.callbackURL : "/dashboard";
  const redirect = new URL("/auth/callback", request.url);
  redirect.searchParams.set("intent", intent); redirect.searchParams.set("callbackURL", callbackURL);
  // Consent is applied only when a new profile is created. Existing customers'
  // preference is never changed by a sign-in request.
  const marketingConsent = body.marketingConsent === true;
  if (marketingConsent) redirect.searchParams.set("marketing_consent", "true");
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect.toString(), shouldCreateUser: intent === "join",
      data: intent === "join" ? { name, first_name: typeof body.firstName === "string" ? body.firstName.slice(0, 60) : "", last_name: typeof body.lastName === "string" ? body.lastName.slice(0, 60) : "", marketing_consent: marketingConsent } : undefined,
    },
  });
  // Same public response prevents account enumeration.
  if (error) console.warn("magic link request rejected", { code: error.code ?? "unknown" });
  return genericSuccess();
}
