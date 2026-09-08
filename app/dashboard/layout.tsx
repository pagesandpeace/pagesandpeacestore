import "@/app/globals.css";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import DashboardUI from "./(ui)/DashboardUI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();

  const supabase = await supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) console.error("[dashboard] auth lookup failed");
  if (!user) redirect("/sign-in?callbackURL=/dashboard");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, auth_user_id, email, name, image, role, marketing_consent_at")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("[dashboard] profile lookup failed");
    redirect("/sign-in?callbackURL=/dashboard");
  }

  if (profile.role === "admin") redirect("/admin");
  if (profile.marketing_consent_at == null) redirect("/onboarding/consent");

  return <DashboardUI user={user} profile={profile}>{children}</DashboardUI>;
}
