import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import DashboardUILayout from "./(ui)/layout";

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

  // --------------------------------------------------
  // 1) Get authenticated user (SERVER AUTH SOURCE OF TRUTH)
  // --------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("❌ [dashboard layout] auth error:", authError);
  }

  if (!user) {
    redirect("/sign-in?callbackURL=/dashboard");
  }

  // --------------------------------------------------
  // 2) Load public.users profile via auth_user_id
  // --------------------------------------------------
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError) {
    console.error("❌ [dashboard layout] profile error:", profileError);
  }

  // --------------------------------------------------
  // 3) Pass BOTH user + profile to client UI layout
  // --------------------------------------------------
  return (
    <DashboardUILayout user={user} profile={profile}>
      {children}
    </DashboardUILayout>
  );
}
