import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔥 CRITICAL: Never touch webhook
  if (pathname.startsWith("/api/stripe/webhook")) {
    return NextResponse.next();
  }

  // Skip static / API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const roleRes = await fetch(`${req.nextUrl.origin}/api/auth/role`, {
    headers: req.headers,
  });
  const { role } = await roleRes.json();

  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account") ||
    pathname === "/";

  if (pathname === "/" && role && role !== "admin" && role !== "staff") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAdminRoute) {
    if (!role) {
      return NextResponse.redirect(new URL("/(auth)/sign-in", req.url));
    }
    if (role !== "admin" && role !== "staff") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isCustomerRoute && (role === "admin" || role === "staff")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/",
  ],
};
