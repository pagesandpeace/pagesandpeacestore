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
     1) Get authenticated user (SERVER SOURCE OF TRUTH)
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
     2) Load public.users profile via auth_user_id
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
     3) 🚫 ADMINS NEVER SEE /dashboard
  -------------------------------------------------- */
  console.log("🟦 [DASHBOARD] profile.role =", profile?.role);

  if (profile?.role === "admin") {
    console.log("🟦 [DASHBOARD] admin detected → redirect /admin");
    redirect("/admin");
  }

  /* --------------------------------------------------
     4) Render CLIENT UI
  -------------------------------------------------- */
  console.log("🟦 [DASHBOARD] ✅ dashboard access granted");

  return (
    <DashboardUI user={user} profile={profile}>
      {children}
    </DashboardUI>
  );
}
