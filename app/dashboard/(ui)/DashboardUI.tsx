"use client";

import { useState, useEffect, startTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import type { User } from "@supabase/supabase-js";

type UserProfile = { id: string; auth_user_id: string; email: string | null; name: string | null; image: string | null; role: "admin" | "customer"; };
type DashboardUIProps = { children: React.ReactNode; user: User; profile: UserProfile | null; };

export default function DashboardUI({ children, user, profile }: DashboardUIProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!sidebarOpen) return;
    ["/dashboard", "/dashboard/events", "/dashboard/orders", "/dashboard/settings", "/dashboard/account", "/events"].forEach((href) => router.prefetch(href));
  }, [sidebarOpen, router]);

  const handleNav = (href: string) => {
    startTransition(() => router.push(href));
    setTimeout(() => setSidebarOpen(false), 30);
  };

  return <div className="flex bg-background min-h-dvh safe-bottom text-foreground">
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleNav={handleNav} user={user} profile={profile} />
    <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:hidden safe-top">
        <button type="button" aria-label="Open menu" className="inline-flex items-center justify-center rounded p-2" onClick={() => setSidebarOpen(true)}><Bars3Icon className="h-6 w-6 text-gray-800" /></button>
      </header>
      <main className="flex-1 p-4 md:p-8"><Suspense fallback={<div className="opacity-60 text-sm">Loading…</div>}>{children}</Suspense></main>
    </div>
  </div>;
}
