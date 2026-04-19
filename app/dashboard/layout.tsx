import "@/app/globals.css";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import DashboardUI from "./(ui)/DashboardUI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();

  const supabase = await supabaseServer();

  /* --------------------------------------------------
     1) Get authenticated user
  -------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("🟦 [DASHBOARD] auth user:", user?.id, user?.email);

  if (authError) {
    console.error("❌ [dashboard layout] auth error:", authError);
  }

  if (!user) {
    console.log("🟦 [DASHBOARD] no auth user → redirect /sign-in");
    redirect("/sign-in?callbackURL=/dashboard");
  }

  /* --------------------------------------------------
     2) Load profile
  -------------------------------------------------- */
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  console.log("🟦 [DASHBOARD] profile lookup:", profile);

  if (profileError) {
    console.error("❌ [dashboard layout] profile error:", profileError);
  }

  /* --------------------------------------------------
     3) 🚫 ADMINS → /admin
  -------------------------------------------------- */
  console.log("🟦 [DASHBOARD] profile.role =", profile?.role);

  if (profile?.role === "admin") {
    console.log("🟦 [DASHBOARD] admin detected → redirect /admin");
    redirect("/admin");
  }

  /* --------------------------------------------------
   4) 🔥 ONBOARDING LOCK (FIXED + LOGS)
-------------------------------------------------- */

const hasMadeChoice = profile?.marketing_consent_at !== null;

console.log("🟨 [ONBOARDING CHECK]");
console.log("➡️ marketing_consent:", profile?.marketing_consent);
console.log("➡️ marketing_consent_at:", profile?.marketing_consent_at);
console.log("➡️ hasMadeChoice:", hasMadeChoice);

if (!hasMadeChoice) {
  console.log("🚨 [ONBOARDING] redirecting → /onboarding/consent");

  redirect("/onboarding/consent");
}

  /* --------------------------------------------------
     5) Render UI
  -------------------------------------------------- */
  console.log("🟦 [DASHBOARD] ✅ dashboard access granted");

  return (
    <DashboardUI user={user} profile={profile}>
      {children}
    </DashboardUI>
  );
}