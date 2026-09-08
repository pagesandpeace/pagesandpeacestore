import "server-only";

import type { User } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabase/service";

type CompleteAuthOptions = { allowMarketingConsent: boolean };
type Profile = {
  auth_user_id: string;
  first_login_at: string | null;
  first_magic_link_sent_at: string | null;
  magic_link_send_count: number | null;
};

type BeehiivOutcome = "not_requested" | "not_configured" | "subscribed" | "failed";

async function subscribeToBeehiiv(email: string, sendWelcomeEmail: boolean): Promise<BeehiivOutcome> {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!publicationId || !apiKey) return "not_configured";
  const response = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: sendWelcomeEmail }),
  });
  return response.ok ? "subscribed" : "failed";
}

export async function completeAuthenticatedUser(user: User, options: CompleteAuthOptions) {
  if (!user.email) return { ok: false as const, reason: "missing_email" };

  const db = supabaseService().schema("app_core");
  const now = new Date().toISOString();
  const email = user.email.trim().toLowerCase();
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    [meta.first_name, meta.last_name].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(" ") ||
    email.split("@")[0];
  const image = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;

  const { data: existing, error: lookupError } = await db.from("customers")
    .select("auth_user_id,first_login_at,first_magic_link_sent_at,magic_link_send_count")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (lookupError) return { ok: false as const, reason: "profile_lookup" };

  const profile = existing as Profile | null;
  let created = false;

  if (!profile) {
    const marketingConsent = options.allowMarketingConsent;
    const { error } = await db.from("customers").insert({
      auth_user_id: user.id,
      email,
      display_name: fullName,
      profile_image: image,
      email_verified: Boolean(user.email_confirmed_at),
      signup_status: "active",
      auth_provider: typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email",
      marketing_consent: marketingConsent,
      marketing_consent_at: marketingConsent ? now : null,
      first_magic_link_sent_at: user.created_at,
      last_magic_link_sent_at: user.created_at,
      magic_link_send_count: 1,
      first_login_at: now,
      last_login_at: now,
      last_seen_at: now,
      last_magic_link_clicked_at: now,
      has_logged_in: true,
      created_at: now,
      updated_at: now,
    });
    if (error) return { ok: false as const, reason: "profile_create" };
    created = true;

    const beehiiv = marketingConsent ? await subscribeToBeehiiv(email, true).catch(() => "failed" as const) : "not_requested";
    if (beehiiv === "subscribed") {
      await db.from("customers").update({ beehiiv_subscribed: true, beehiiv_subscribed_at: now, updated_at: now }).eq("auth_user_id", user.id);
    }
    console.info("[auth] customer profile created", { consent: marketingConsent, beehiiv });
  } else {
    const { error } = await db.from("customers").update({
      email,
      email_verified: Boolean(user.email_confirmed_at),
      first_login_at: profile.first_login_at ?? now,
      first_magic_link_sent_at: profile.first_magic_link_sent_at ?? user.created_at,
      magic_link_send_count: profile.magic_link_send_count ?? 1,
      last_login_at: now,
      last_seen_at: now,
      last_magic_link_clicked_at: now,
      has_logged_in: true,
      signup_status: "active",
      updated_at: now,
    }).eq("auth_user_id", user.id);
    if (error) return { ok: false as const, reason: "profile_update" };
  }

  return { ok: true as const, created };
}
