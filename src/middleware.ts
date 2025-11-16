import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  console.log("🧭 [middleware] HIT:", req.nextUrl.pathname);

  // Skip static & API
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/public")
  ) {
    console.log("🟡 [middleware] skipping static/API");
    return NextResponse.next();
  }

  const origin = req.nextUrl.origin;
  console.log("🔍 [middleware] fetching role from:", `${origin}/api/auth/role`);

  const roleRes = await fetch(`${origin}/api/auth/role`, {
    headers: req.headers,
  });

  console.log("🔍 [middleware] /api/auth/role status:", roleRes.status);

  let roleJson: any = {};
  try {
    roleJson = await roleRes.json();
  } catch (e) {
    console.log("❌ [middleware] failed to parse role JSON");
  }

  console.log("🎭 [middleware] User role:", roleJson.role);

  const role = roleJson.role;
  const path = req.nextUrl.pathname;

  const isAdmin = path.startsWith("/admin");
  const isCustomer =
    path.startsWith("/dashboard") ||
    path.startsWith("/account") ||
    path === "/";

  // redirect rules
  if (path === "/" && role && role !== "admin" && role !== "staff") {
    console.log("➡️ [middleware] Redirect customer → /dashboard");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAdmin) {
    if (!role) {
      console.log("🚫 [middleware] No role → redirect to sign-in");
      return NextResponse.redirect(new URL("/(auth)/sign-in", req.url));
    }
    if (role !== "admin" && role !== "staff") {
      console.log("🚫 [middleware] Not admin/staff, redirect → /dashboard");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isCustomer && (role === "admin" || role === "staff")) {
    console.log("➡️ [middleware] Admin trying to access customer → /admin");
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  console.log("🟢 [middleware] PASS");
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/account/:path*", "/"],
};
