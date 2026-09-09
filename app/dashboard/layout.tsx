import "@/app/globals.css";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { unstable_noStore as noStore } from "next/cache";
import DashboardUI from "./(ui)/DashboardUI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();

  const auth = await supabaseAuthServer();
  const { data: { user }, error: authError } = await auth.auth.getUser();

  if (authError) console.error("[dashboard] auth lookup failed");
  if (!user) redirect("/sign-in?callbackURL=/dashboard");

  const db = supabaseService().schema("app_core");
  const [{ data: customer, error: profileError }, { data: admin }] = await Promise.all([
    db.from("customers")
      .select("auth_user_id,email,display_name,profile_image,marketing_consent_at")
      .eq("auth_user_id", user.id)
      .single(),
    db.from("admins").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle(),
  ]);

  if (profileError || !customer) {
    console.error("[dashboard] profile lookup failed");
    redirect("/sign-in?callbackURL=/dashboard");
  }

  if (admin) redirect("/admin");
  if (customer.marketing_consent_at == null) redirect("/onboarding/consent");

  const profile = {
    id: customer.auth_user_id,
    auth_user_id: customer.auth_user_id,
    email: customer.email,
    name: customer.display_name,
    image: customer.profile_image,
    role: "customer" as const,
  };

  return <DashboardUI user={user} profile={profile}>{children}</DashboardUI>;
}
