// app/admin/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase/server";

import DashboardKpiCards from "@/components/admin/dashboard/DashboardKpiCards";
import LowStockWidget from "@/components/admin/dashboard/LowStockWidget";
import AdminRevenueChart from "@/components/admin/dashboard/AdminRevenueChart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------
   TYPES
------------------------------------------------------------------ */
type MetricRow = {
  month: string;
  shop_revenue: number;
  event_revenue: number;
  net_revenue: number;
  refunded_revenue: number;
  event_bookings: number;
  event_seats: number;
  signups: number;
};

/* ------------------------------------------------------------------
   PAGE
------------------------------------------------------------------ */
export default async function AdminDashboardPage() {
  noStore();

  console.log("--------------------------------------------------");
  console.log("🔍 Admin dashboard loading...");

  const supabase = await supabaseServer();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* ------------------------------------------------------------------
     AUTH
  ------------------------------------------------------------------ */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("👤 Auth user:", user?.email ?? "No user");
  console.log("👤 Auth error:", authError ?? "No auth error");

  if (!user) {
    console.log("🚫 No user found. Redirecting to sign in.");
    redirect("/sign-in?callbackURL=/admin");
  }

  /* ------------------------------------------------------------------
     PROFILE CHECK
  ------------------------------------------------------------------ */
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  console.log("👤 Profile:", profile);
  console.log("👤 Profile error:", profileError ?? "No profile error");

  if (profile?.role !== "admin") {
    console.log("🚫 User is not admin. Redirecting to dashboard.");
    redirect("/dashboard");
  }

  console.log("🟥 [ADMIN] ✅ admin access granted");

  /* ------------------------------------------------------------------
     RPC – ADMIN METRICS
  ------------------------------------------------------------------ */
  const { data: rpc, error: rpcError } = await supabase.rpc(
    "get_admin_dashboard_metrics"
  );

  if (rpcError) {
    console.error("❌ Admin metrics RPC failed:", rpcError);
  } else {
    console.log("✅ Admin metrics RPC succeeded");
  }

  console.log("🔥 RPC keys:", rpc ? Object.keys(rpc) : "No RPC data");
  console.log("📊 RPC totals:", rpc?.totals ?? "Missing totals");
  console.log("📅 RPC current_month:", rpc?.current_month ?? "Missing current_month");
  console.log("📅 RPC previous_month:", rpc?.previous_month ?? "Missing previous_month");
  console.log("📈 RPC month_change:", rpc?.month_change ?? "Missing month_change");
  console.log(
    "📉 RPC monthly_metrics length:",
    Array.isArray(rpc?.monthly_metrics)
      ? rpc.monthly_metrics.length
      : "Missing monthly_metrics"
  );

  const metrics: MetricRow[] = rpc?.monthly_metrics ?? rpc?.metrics ?? [];
  const lowStock = rpc?.low_stock_products ?? [];

  console.log("📦 Low stock item count:", lowStock.length);
  console.log("📉 Metrics preview:", metrics.slice(0, 3));

  /* ------------------------------------------------------------------
     FEEDBACK
  ------------------------------------------------------------------ */
  const { data: feedbackData, error: feedbackError } = await supabaseAdmin
    .from("feedback")
    .select("rating");

  if (feedbackError) {
    console.error("❌ Feedback query failed:", feedbackError);
  } else {
    console.log("✅ Feedback query succeeded");
  }

  const feedback = feedbackData ?? [];
  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + Number(f.rating ?? 0), 0) /
        totalFeedback
      : 0;

  console.log("⭐ Feedback stats:", {
    totalFeedback,
    averageRating,
  });

  /* ------------------------------------------------------------------
     EMAIL SUBSCRIBERS
  ------------------------------------------------------------------ */
  const { data: subs, error: subsError } = await supabaseAdmin
    .from("users")
    .select("id, email, beehiiv_subscribed")
    .eq("beehiiv_subscribed", true);

  if (subsError) {
    console.error("❌ Subscribers query failed:", subsError);
  } else {
    console.log("✅ Subscribers query succeeded");
  }

  const totalEmailSubscribers = subs?.length ?? 0;

  console.log("📧 Subscriber count:", totalEmailSubscribers);
  console.log("✅ Admin dashboard render starting");
  console.log("--------------------------------------------------");

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="mx-auto max-w-6xl space-y-10 py-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <DashboardKpiCards
        totals={rpc?.totals ?? {}}
        currentMonth={rpc?.current_month ?? {}}
        previousMonth={rpc?.previous_month ?? {}}
        monthChange={rpc?.month_change ?? {}}
        totalFeedback={totalFeedback}
        averageRating={averageRating}
        totalEmailSubscribers={totalEmailSubscribers}
      />

      <AdminRevenueChart data={metrics} />

      <LowStockWidget items={lowStock} />
    </div>
  );
}