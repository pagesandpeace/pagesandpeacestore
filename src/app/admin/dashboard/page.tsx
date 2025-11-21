export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import {
  events,
  eventBookings,
  orders,
  users,
  feedback,
  newsletterSubscribers,
} from "@/lib/db/schema";

import { getCurrentUserServer } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

import DashboardKpiCards from "@/components/admin/dashboard/DashboardKpiCards";
import RevenueChart from "@/components/admin/dashboard/RevenueChart";
import BookingsChart from "@/components/admin/dashboard/BookingsChart";
import UserSignupChart from "@/components/admin/dashboard/UserSignupChart";

import { eq, sql } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const user = await getCurrentUserServer();

  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/dashboard");

  /* ------------------------------------------------------
     1. TOTAL REVENUE
  ------------------------------------------------------ */
  const revenueRows = await db
    .select({
      total: sql<number>`SUM(CAST(${orders.total} AS NUMERIC))`,
    })
    .from(orders)
    .where(eq(orders.status, "completed"));

  const totalRevenue = Number(revenueRows[0]?.total || 0);

  /* ------------------------------------------------------
     2. TOTAL EVENTS & BOOKINGS
  ------------------------------------------------------ */
  const totalEvents = (await db.select().from(events)).length;

  const totalBookings = (
    await db
      .select()
      .from(eventBookings)
      .where(eq(eventBookings.cancelled, false))
  ).length;

  /* ------------------------------------------------------
     3. REFUND RATE
  ------------------------------------------------------ */
  const refundedBookings = (
    await db
      .select()
      .from(eventBookings)
      .where(eq(eventBookings.refunded, true))
  ).length;

  const refundRate =
    totalBookings > 0
      ? Math.round((refundedBookings / totalBookings) * 100)
      : 0;

  /* ------------------------------------------------------
     4. MONTHLY REVENUE
  ------------------------------------------------------ */
  const monthlyRevenue = await db
    .select({
      month: sql<string>`TO_CHAR(${orders.paidAt}, 'Mon')`,
      value: sql<number>`SUM(CAST(${orders.total} AS NUMERIC))`,
    })
    .from(orders)
    .where(eq(orders.status, "completed"))
    .groupBy(sql`1`)
    .orderBy(sql`MIN(${orders.paidAt})`);

  /* ------------------------------------------------------
     5. MONTHLY BOOKINGS
  ------------------------------------------------------ */
  const monthlyBookings = await db
    .select({
      month: sql<string>`TO_CHAR(${eventBookings.createdAt}, 'Mon')`,
      value: sql<number>`COUNT(*)`,
    })
    .from(eventBookings)
    .where(eq(eventBookings.cancelled, false))
    .groupBy(sql`1`)
    .orderBy(sql`MIN(${eventBookings.createdAt})`);

  /* ------------------------------------------------------
     6. MONTHLY USER SIGNUPS
  ------------------------------------------------------ */
  const monthlySignups = await db
    .select({
      month: sql<string>`TO_CHAR(${users.createdAt}, 'Mon')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(users)
    .groupBy(sql`1`)
    .orderBy(sql`MIN(${users.createdAt})`);

  /* ------------------------------------------------------
     7. TOTAL SIGNUPS
  ------------------------------------------------------ */
  const totalSignups = (await db.select().from(users)).length;

  /* ------------------------------------------------------
     8. FEEDBACK (COUNT & AVERAGE RATING)
  ------------------------------------------------------ */
  const feedbackRows = await db.select().from(feedback);

  const sumRatings = feedbackRows.reduce(
    (acc, f) => acc + Number(f.rating),
    0
  );

  const averageRating =
    feedbackRows.length > 0 ? sumRatings / feedbackRows.length : 0;

  const totalFeedback = feedbackRows.length;

  /* ------------------------------------------------------
     9. EMAIL SUBSCRIBERS (Beehiiv via our table)
  ------------------------------------------------------ */
  const totalEmailSubscribers = (
    await db.select().from(newsletterSubscribers)
  ).length;

  /* ------------------------------------------------------
     RENDER PAGE
  ------------------------------------------------------ */
  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <DashboardKpiCards
        totalRevenue={totalRevenue}
        totalEvents={totalEvents}
        totalBookings={totalBookings}
        refundRate={refundRate}
        totalSignups={totalSignups}
        totalFeedback={totalFeedback}
        averageRating={averageRating}
        totalEmailSubscribers={totalEmailSubscribers}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={monthlyRevenue} />
        <BookingsChart data={monthlyBookings} />
        <UserSignupChart data={monthlySignups} />
      </div>
    </div>
  );
}
