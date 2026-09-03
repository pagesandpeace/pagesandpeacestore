import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Private database client for the rebuild.
 * Never import this module from Client Components.
 */
export function appCoreDb() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing server-side Supabase configuration");
  }

  return createClient(url, serviceRoleKey, {
    db: { schema: "app_core" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
