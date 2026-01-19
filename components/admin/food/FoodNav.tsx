"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  { label: "Overview", href: "/admin/food" },
  { label: "Reconciliation", href: "/admin/food/reconciliation" },
];

export default function FoodNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[var(--muted)] mb-6">
      <nav className="flex gap-6 px-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/admin/food" &&
              pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "pb-3 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
