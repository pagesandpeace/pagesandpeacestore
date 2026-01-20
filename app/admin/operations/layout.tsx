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

  // ✅ Robust route matching
  const isActiveTab = pathname === "/admin/operations";
  const isSuppliersTab = pathname.startsWith(
    "/admin/operations/suppliers"
  );
  const isClosedTab = pathname.startsWith(
    "/admin/operations/closed"
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold">
          Operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Picking, supplier orders, and completed collections
        </p>
      </div>

      {/* TABS */}
      <nav className="flex gap-2 border-b border-muted pb-3">
        <Tab href="/admin/operations" active={isActiveTab}>
          Active
        </Tab>

        <Tab
          href="/admin/operations/closed"
          active={isClosedTab}
        >
          Closed
        </Tab>
      </nav>

      {/* CONTENT */}
      <div className="animate-fadeIn">
        {children}
      </div>
    </div>
  );
}
