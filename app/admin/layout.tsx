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
  // 🔴 CRITICAL: breaks App Router caching for auth + role checks
  noStore();

  const supabase = await supabaseServer();

  /* ----------------------------------------
     1️⃣ AUTH USER (Supabase Auth)
  ---------------------------------------- */
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

  /* ----------------------------------------
     2️⃣ BUSINESS ROLE (public.users)
     ✅ JOIN VIA auth_user_id (FIX)
  ---------------------------------------- */
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id) // ✅ CORRECT JOIN
    .single();

  if (profileErr) {
    console.error("❌ [admin layout] profile lookup error:", profileErr);
  }

  const role = profile?.role ?? "customer";

  console.log(
    "[admin layout] access check →",
    user.email,
    "role:",
    role
  );

  /* ----------------------------------------
     3️⃣ ACCESS CONTROL
  ---------------------------------------- */
  if (role !== "admin") {
    redirect("/dashboard");
  }

  /* ----------------------------------------
     4️⃣ ADMIN VIEW
  ---------------------------------------- */
  return (
    <div className="min-h-dvh flex bg-[#FAF6F1]">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">{children}</main>
    </div>
  );
}
