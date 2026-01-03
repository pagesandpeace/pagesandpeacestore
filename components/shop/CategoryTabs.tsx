"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export type CategoryOption = {
  key: string;
  label: string;
};

export default function CategoryTabs({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();

  const activeType = params.get("type") ?? "all";
  const isBestsellersPage = pathname === "/shop/bestsellers";

  return (
<div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
      {categories.map((cat) => {
        const isBestsellers = cat.key === "bestsellers";

        // -----------------------------
        // BESTSELLERS = DESTINATION
        // -----------------------------
        if (isBestsellers) {
          const isActive = isBestsellersPage;

          return (
            <Link
              key={cat.key}
              href="/shop/bestsellers"
              className={`
                whitespace-nowrap px-5 py-2 rounded-full border text-sm font-medium shrink-0 transition-all
                ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-white text-[#111] border-gray-300 hover:bg-gray-100"
                }
              `}
            >
              {cat.label}
            </Link>
          );
        }

        // -----------------------------
        // NORMAL CATEGORIES = FILTERS
        // -----------------------------
        const isActive = !isBestsellersPage && activeType === cat.key;

        // Clear all other filters when switching category
        const base = new URLSearchParams();

        if (cat.key !== "all") {
          base.set("type", cat.key);
        }

        const href = `/shop${base.toString() ? `?${base.toString()}` : ""}`;

        return (
          <Link
            key={cat.key}
            href={href}
            replace
            className={`
              whitespace-nowrap px-5 py-2 rounded-full border text-sm font-medium shrink-0 transition-all
              ${
                isActive
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-white text-[#111] border-gray-300 hover:bg-gray-100"
              }
            `}
          >
            {cat.label}
          </Link>
        );
      })}
    </div>
  );
}
