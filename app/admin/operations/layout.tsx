"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

type TabProps = {
  href: string;
  active: boolean;
  children: ReactNode;
};

function Tab({ href, active, children }: TabProps) {
  return (
    <Link
      href={href}
      className={[
        "px-4 py-2 rounded-full text-sm font-medium border transition",
        active
          ? "bg-accent text-background border-accent"
          : "bg-background text-foreground/80 border-muted hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function OperationsLayout({ children }: Props) {
  const pathname = usePathname();

  /* ---------------- TAB MATCHING (EXACT) ---------------- */

  const isActiveTab =
    pathname === "/admin/operations";

  const isClosedTab =
    pathname === "/admin/operations/closed";

  const isPhysicalTab =
    pathname === "/admin/operations/physical";

  const isPhysicalHistoryTab =
    pathname === "/admin/operations/physical-history";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold">
          Operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Picking, supplier orders, and physical sales
        </p>
      </div>

      {/* TABS */}
      <nav className="flex flex-wrap gap-2 border-b border-muted pb-3">
        <Tab
          href="/admin/operations"
          active={isActiveTab}
        >
          Active
        </Tab>

        <Tab
          href="/admin/operations/closed"
          active={isClosedTab}
        >
          Closed
        </Tab>

        <Tab
          href="/admin/operations/physical"
          active={isPhysicalTab}
        >
          Physical sales
        </Tab>

        <Tab
          href="/admin/operations/physical-history"
          active={isPhysicalHistoryTab}
        >
          Physical sales history
        </Tab>
      </nav>

      {/* CONTENT */}
      <div className="animate-fadeIn">
        {children}
      </div>
    </div>
  );
}
