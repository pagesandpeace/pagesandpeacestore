import { redirect } from "next/navigation";

import AppCoreEventSalesSummary from "@/components/admin/app-core-event-sales-summary";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin");

  return <main className="mx-auto max-w-6xl space-y-8 py-10">
    <div><h1 className="text-3xl font-bold">Business dashboard</h1><p className="mt-2 text-foreground/65">Event sales, bookings and refunds.</p></div>
    <AppCoreEventSalesSummary />
  </main>;
}
