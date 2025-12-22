// lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ THIS KEY
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
