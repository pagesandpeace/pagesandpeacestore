import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Canonical server-side Supabase client
 * - Auth aware
 * - Respects RLS
 * - Uses cookies
 */
export async function supabaseAuthServer() {
  const cookieStore = await cookies(); // ✅ MUST await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components may throw if headers already sent
          }
        },
      },
    }
  );
}

/**
 * 🔁 Backwards compatibility
 * Do NOT remove unless you refactor all imports
 */
export const supabaseServer = supabaseAuthServer;
