export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;


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
    <div
      className="
        flex min-h-screen bg-[#FAF6F1]
        pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right
      "
    >
      {/* FIXED SIDEBAR */}
      <AdminSidebar />

      {/* MAIN AREA */}
      <main
        className="
          flex-1 md:ml-64 
          p-6 md:p-10 
          min-h-screen 
          overflow-x-hidden
        "
      >
        {children}
      </main>
    </div>
  );
}
