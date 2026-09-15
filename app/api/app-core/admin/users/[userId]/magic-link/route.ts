import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectBack(request: Request, outcome: "sent" | "failed") {
  const referer = request.headers.get("referer");
  const url = new URL(referer && referer.startsWith(new URL(request.url).origin) ? referer : "/admin/users", request.url);
  url.searchParams.set("magic_link", outcome);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (!uuidPattern.test(userId)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  const service = supabaseService();
  const { data: userLookup, error: userError } = await service.auth.admin.getUserById(userId);
  const email = userLookup.user?.email?.trim().toLowerCase();
  if (userError || !email) return redirectBack(request, "failed");

  const callback = new URL("/auth/callback", request.url);
  callback.searchParams.set("intent", "signin");
  callback.searchParams.set("callbackURL", "/dashboard");

  const { error: linkError } = await service.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  });
  if (linkError) return redirectBack(request, "failed");

  const now = new Date().toISOString();
  await service.schema("app_core").from("customers").update({
    last_magic_link_sent_at: now,
    updated_at: now,
  }).eq("auth_user_id", userId);

  console.info("[admin-auth-support] magic link sent", { targetUserId: userId, adminUserId: admin.id });
  return redirectBack(request, "sent");
}
