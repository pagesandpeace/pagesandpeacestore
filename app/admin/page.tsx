// app/admin/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js"; // ⭐ NEW

import DashboardKpiCards from "@/components/admin/dashboard/DashboardKpiCards";
import LowStockWidget from "@/components/admin/dashboard/LowStockWidget";
import CollapsibleSection from "@/components/admin/dashboard/CollapsibleSection";
import ChartWrapper from "@/components/admin/dashboard/ChartWrapper";
import ShopRevenueChart from "@/components/admin/dashboard/ShopRevenueChart";
import EventRevenueChart from "@/components/admin/dashboard/EventRevenueChart";
import RefundRevenueChart from "@/components/admin/dashboard/RefundRevenueChart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------
   TYPES
------------------------------------------------------------------ */
type ChartPoint = {
  month: string;
  value: number;
};

type MetricRow = {
  month: string;
  shop_revenue: number;
  event_revenue: number;
  refunded_revenue?: number;
};

/* ------------------------------------------------------------------
   PAGE
------------------------------------------------------------------ */
export default async function AdminDashboardPage() {
  noStore();

  // 🔐 USER CLIENT (respects RLS)
  const supabase = await supabaseServer();

  // 🔓 ADMIN CLIENT (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("🔍 Admin dashboard loading...");

  /* ------------------------------------------------------------------
     AUTH
  ------------------------------------------------------------------ */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("👤 Auth user:", user?.email, authError);

  if (!user) {
    redirect("/sign-in?callbackURL=/admin");
  }

  /* ------------------------------------------------------------------
     PROFILE CHECK (still RLS-safe)
  ------------------------------------------------------------------ */
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  console.log("👤 Profile:", profile, profileError);

  if (profile?.role !== "admin") {
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
  }

  const totals = rpc?.totals ?? {};
  const metrics: MetricRow[] = rpc?.metrics ?? [];
  const lowStock = rpc?.low_stock_products ?? [];

  /* ------------------------------------------------------------------
     CHART DATA
  ------------------------------------------------------------------ */
  const shopRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.shop_revenue,
  }));

  const eventRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.event_revenue,
  }));

  const refundRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.refunded_revenue ?? 0,
  }));

  /* ------------------------------------------------------------------
     KPI DATA
  ------------------------------------------------------------------ */
  const totalRevenue = totals.total_revenue ?? 0;
  const netRevenue = totals.net_revenue ?? 0;
  const refundedRevenue = totals.refunded_revenue ?? 0;

  const refundRate =
    totalRevenue > 0 ? refundedRevenue / totalRevenue : 0;

  const shopRevenue = totals.shop_revenue ?? 0;
  const eventRevenue = totals.event_revenue ?? 0;

  const totalEvents = totals.total_events ?? 0;
  const totalBookings = totals.event_bookings ?? 0;
  const totalSignups = totals.total_signups ?? 0;

  /* ------------------------------------------------------------------
     FEEDBACK
  ------------------------------------------------------------------ */
  const { data: feedbackData } = await supabaseAdmin
  .from("feedback")
  .select("rating");

  const feedback = feedbackData ?? [];
  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

  /* ------------------------------------------------------------------
     🔥 EMAIL SUBSCRIBERS (FIXED WITH ADMIN CLIENT)
  ------------------------------------------------------------------ */
  const { data: subs, error: subsError } = await supabaseAdmin
    .from("users")
    .select("id, email, beehiiv_subscribed")
    .eq("beehiiv_subscribed", true);

  console.log("📧 Subscribers query result:", subs);
  console.log("❌ Subscribers query error:", subsError);

  const totalEmailSubscribers = subs?.length ?? 0;

  console.log("📊 Total Email Subscribers:", totalEmailSubscribers);

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <DashboardKpiCards
        totalRevenue={totalRevenue}
        netRevenue={netRevenue}
        refundedRevenue={refundedRevenue}
        refundRate={refundRate}
        shopRevenue={shopRevenue}
        eventRevenue={eventRevenue}
        totalEvents={totalEvents}
        totalBookings={totalBookings}
        totalSignups={totalSignups}
        totalFeedback={totalFeedback}
        averageRating={averageRating}
        totalEmailSubscribers={totalEmailSubscribers}
      />

      <LowStockWidget items={lowStock} />

      <CollapsibleSection title="Shop Revenue">
        <ChartWrapper>
          <ShopRevenueChart data={shopRevenueData} />
        </ChartWrapper>
      </CollapsibleSection>

      <CollapsibleSection title="Event Revenue">
        <ChartWrapper>
          <EventRevenueChart data={eventRevenueData} />
        </ChartWrapper>
      </CollapsibleSection>

      <CollapsibleSection title="Refunded Revenue">
        <ChartWrapper>
          <RefundRevenueChart data={refundRevenueData} />
        </ChartWrapper>
      </CollapsibleSection>
    </div>
  );
}