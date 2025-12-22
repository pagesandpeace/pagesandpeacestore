import "@/app/globals.css";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();

  const supabase = await supabaseServer();

  /* --------------------------------------------------
     1) Get auth user (server source of truth)
  -------------------------------------------------- */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("❌ [admin layout] getUser error:", authErr);
  }

  if (!user) {
    redirect("/sign-in?callbackURL=/admin");
  }

  /* --------------------------------------------------
     2) Load public.users profile (JOIN VIA auth_user_id)
  -------------------------------------------------- */
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profileErr || !profile) {
    console.error("❌ [admin layout] profile error:", profileErr);
    redirect("/dashboard");
  }

  /* --------------------------------------------------
     3) Enforce admin role
  -------------------------------------------------- */
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  /* --------------------------------------------------
     4) Render admin UI
  -------------------------------------------------- */
  return (
    <div className="min-h-dvh flex bg-[#FAF6F1]">
      <AdminSidebar user={user} profile={profile} />
      <main className="flex-1 ml-64 p-10">{children}</main>
    </div>
  );
}
