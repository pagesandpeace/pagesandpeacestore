"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] overflow-hidden">
      {/* Header (mobile only) */}
      <Header variant="dashboard" onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Dim background overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className="
          flex-1
          flex flex-col
          overflow-y-auto
          md:overflow-y-auto
          px-4 sm:px-6 lg:px-10
          pt-[72px] md:pt-10
          transition-all duration-300
        "
      >
        <div
          className="
            max-w-[1200px]
            w-full
            mx-auto
            md:ml-0
            flex-1
          "
        >
          {children}
        </div>
      </main>
    </div>
  );
}
