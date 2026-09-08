import "server-only";

import crypto from "crypto";
import { createClient, type User } from "@supabase/supabase-js";

type CompleteAuthOptions = { allowMarketingConsent: boolean };
type Profile = { id: string; auth_user_id: string | null; first_login_at: string | null; first_magic_link_sent_at: string | null; magic_link_send_count: number | null };

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server-side Supabase configuration");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function subscribeToBeehiiv(email: string, sendWelcomeEmail: boolean) {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!publicationId || !apiKey) return false;
  const response = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: sendWelcomeEmail }),
  });
  return response.ok;
}

/** Mirrors a verified Auth user into the legacy profile. Consent is only applied on first account creation. */
export async function completeAuthenticatedUser(user: User, options: CompleteAuthOptions) {
  if (!user.email) return { ok: false as const, reason: "missing_email" };
  const db = adminDb();
  const now = new Date().toISOString();
  const email = user.email.trim().toLowerCase();
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    [meta.first_name, meta.last_name].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(" ") ||
    email.split("@")[0];
  const image = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;

  const { data: byAuthId, error: byAuthIdError } = await db.from("users")
    .select("id, auth_user_id, first_login_at, first_magic_link_sent_at, magic_link_send_count")
    .eq("auth_user_id", user.id).maybeSingle();
  if (byAuthIdError) return { ok: false as const, reason: "profile_lookup" };
  let profile = byAuthId as Profile | null;

  if (!profile) {
    const { data: byEmail, error: byEmailError } = await db.from("users")
      .select("id, auth_user_id, first_login_at, first_magic_link_sent_at, magic_link_send_count")
      .eq("email", email).maybeSingle();
    if (byEmailError) return { ok: false as const, reason: "profile_lookup" };
    profile = byEmail as Profile | null;
    if (profile && profile.auth_user_id !== user.id) {
      const { error } = await db.from("users").update({ auth_user_id: user.id, updated_at: now }).eq("id", profile.id);
      if (error) return { ok: false as const, reason: "profile_repair" };
    }
  }

  let created = false;
  if (!profile) {
    const marketingConsent = options.allowMarketingConsent;
    const { error } = await db.from("users").insert({
      id: crypto.randomUUID(), auth_user_id: user.id, email, name: fullName, image,
      role: "customer", auth_provider: typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email",
      email_verified: Boolean(user.email_confirmed_at), signup_status: "active",
      marketing_consent: marketingConsent, marketing_consent_at: marketingConsent ? now : null,
      first_magic_link_sent_at: user.created_at, last_magic_link_sent_at: user.created_at, magic_link_send_count: 1,
      first_login_at: now, last_login_at: now, last_seen_at: now, last_magic_link_clicked_at: now, has_logged_in: true,
      created_at: now, updated_at: now,
    });
    if (error) return { ok: false as const, reason: "profile_create" };
    created = true;
    if (marketingConsent && await subscribeToBeehiiv(email, true).catch(() => false)) {
      await db.from("users").update({ beehiiv_subscribed: true, beehiiv_subscribed_at: now, updated_at: now }).eq("auth_user_id", user.id);
    }
  } else {
    const { error } = await db.from("users").update({
      auth_user_id: user.id, email_verified: Boolean(user.email_confirmed_at),
      first_login_at: profile.first_login_at ?? now,
      first_magic_link_sent_at: profile.first_magic_link_sent_at ?? user.created_at,
      magic_link_send_count: profile.magic_link_send_count ?? 1,
      last_login_at: now, last_seen_at: now, last_magic_link_clicked_at: now,
      has_logged_in: true, signup_status: "active", updated_at: now,
    }).eq("id", profile.id);
    if (error) return { ok: false as const, reason: "profile_update" };
  }
  return { ok: true as const, created };
}
