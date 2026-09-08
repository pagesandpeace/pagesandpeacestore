import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function middleware(request: NextRequest) {
  // The rebuild deliberately has no legacy /api/admin surface. New protected
  // admin endpoints live under /api/app-core/admin and authorise server-side.
  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWithCookies(request, response, "/sign-in");
  // Admin authorisation is deliberately performed by server pages/routes
  // against immutable public.admin_users, not users.role.
  return response;
}

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*", "/api/admin/:path*"] };
