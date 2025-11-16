// src/app/dashboard/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* FIXED SIDEBAR */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* MAIN AREA — shifted right on desktop */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">

        {/* TOP NAV (only visible on mobile) */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6 text-gray-800" />
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
