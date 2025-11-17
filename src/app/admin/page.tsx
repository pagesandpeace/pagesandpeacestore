export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/actions";

export default async function AdminHomePage() {
  const user = await getCurrentUserServer();

  // If not logged in → login page
  if (!user) {
    redirect("/sign-in");
  }

  // If logged in but not admin → dashboard
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to the Admin Dashboard</h1>

      <p>Select a section from the sidebar.</p>

      <div className="space-y-3">
        <Link href="/admin/events" className="text-blue-600 underline">
          → View all events
        </Link>

        <br />

        <Link href="/admin/events/new" className="text-blue-600 underline">
          → Create a new event
        </Link>
      </div>
    </div>
  );
}
