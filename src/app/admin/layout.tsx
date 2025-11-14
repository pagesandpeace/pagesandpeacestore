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
    <div className="min-h-screen bg-[#FAF6F1] flex">
      <AdminSidebar />
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
