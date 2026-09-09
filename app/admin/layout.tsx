import "@/app/globals.css";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { unstable_noStore as noStore } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  noStore();

  const auth = await supabaseAuthServer();
  const { data: { user }, error: authErr } = await auth.auth.getUser();

  if (authErr) console.error("[admin] auth lookup failed");
  if (!user) redirect("/sign-in?callbackURL=/admin");

  const db = supabaseService().schema("app_core");
  const [{ data: customer, error: customerErr }, { data: admin, error: adminErr }] = await Promise.all([
    db.from("customers")
      .select("id,auth_user_id,email,display_name,profile_image")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    db.from("admins")
      .select("auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  if (customerErr || !customer) {
    console.error("[admin] app_core customer lookup failed");
    redirect("/dashboard");
  }

  if (adminErr || !admin) redirect("/dashboard");

  const profile = {
    id: customer.id,
    auth_user_id: customer.auth_user_id,
    email: customer.email,
    name: customer.display_name,
    image: customer.profile_image,
    role: "admin" as const,
  };

  return <div className="min-h-dvh flex bg-[#FAF6F1]">
    <AdminSidebar user={user} profile={profile} />
    <main className="flex-1 ml-64 p-10">{children}</main>
  </div>;
}
