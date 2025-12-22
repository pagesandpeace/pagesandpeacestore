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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("❌ [dashboard layout] auth error:", error);
  }

  if (!user) {
    redirect("/sign-in?callbackURL=/dashboard");
  }

  // ✅ Authenticated → render UI layout
  return <DashboardUILayout>{children}</DashboardUILayout>;
}
