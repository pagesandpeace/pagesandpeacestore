"use client";

import { useState, useEffect, startTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  /* -------------------------------------------------------
     PREFETCH KEY DASHBOARD ROUTES
  ------------------------------------------------------- */
  useEffect(() => {
    if (!sidebarOpen) return;

    router.prefetch("/dashboard");
    router.prefetch("/dashboard/events");
    router.prefetch("/dashboard/orders");
    router.prefetch("/dashboard/settings");
    router.prefetch("/dashboard/account");
    router.prefetch("/dashboard/chapters-club");
    router.prefetch("/shop");
  }, [sidebarOpen, router]);

  const handleNav = (href: string) => {
    startTransition(() => router.push(href));
    setTimeout(() => setSidebarOpen(false), 30);
  };

  return (
    <div className="flex bg-background min-h-dvh safe-bottom text-foreground">
      {/* SIDEBAR */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleNav={handleNav}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
        <MobileTopBar openSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-8">
          <Suspense fallback={<div className="opacity-60 text-sm">Loading…</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MOBILE TOP BAR
------------------------------------------------------- */
function MobileTopBar({ openSidebar }: { openSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:hidden safe-top">
      <button
        type="button"
        aria-label="Open menu"
        className="inline-flex items-center justify-center rounded p-2"
        onClick={openSidebar}
      >
        <Bars3Icon className="h-6 w-6 text-gray-800" />
      </button>
    </header>
  );
}
