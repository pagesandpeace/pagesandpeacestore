import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseAuthServer } from "@/lib/supabase/server";

function adminRegistryDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing server-side Supabase configuration");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns the authenticated user only when their immutable Auth ID is present
 * in public.admin_users. Do not authorise from public.users.role.
 */
export async function requireAdminUser() {
  const auth = await supabaseAuthServer();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) return null;

  const adminDb = adminRegistryDb();
  const { data, error } = await adminDb
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return user;
}
