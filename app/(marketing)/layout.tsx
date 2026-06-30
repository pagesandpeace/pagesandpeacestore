"use client";

import Navbar from "@/components/Navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--background)]">
      <Navbar />

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}