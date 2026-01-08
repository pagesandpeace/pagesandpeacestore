import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔒 Absolutely never touch auth during callbacks
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Intentionally no auth/session logic here.
  // OAuth + magic links must complete without interference.

  return response;
}
