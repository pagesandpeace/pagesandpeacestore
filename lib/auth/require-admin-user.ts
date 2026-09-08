import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

/** Returns the authenticated user only when their immutable Auth ID is in app_core.admins. */
export async function requireAdminUser() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseService().schema("app_core")
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return user;
}
