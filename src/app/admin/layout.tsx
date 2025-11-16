import { ReactNode } from "react";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserServer();

  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    redirect("/account");
  }

  return (
    <div className="flex min-h-screen bg-[#FAF6F1]">
      {/* FIXED SIDEBAR */}
      <AdminSidebar />

      {/* MAIN AREA — shifted right so content never sits under sidebar */}
      <main className="flex-1 md:ml-64 p-10 min-h-screen">
        {children}
      </main>
    </div>
  );
}
