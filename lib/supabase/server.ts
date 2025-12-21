export const runtime = "nodejs";

import { cookies } from "next/headers";
import {
  createServerClient,
  type CookieOptions
} from "@supabase/ssr";

export async function supabaseServer() {
  // ⭐ Next.js 15 requires awaiting cookies()
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: CookieOptions) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );
}
