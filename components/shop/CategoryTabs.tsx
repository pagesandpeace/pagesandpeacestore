"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type CategoryOption = {
  key: string;
  label: string;
};

export default function CategoryTabs({ categories }: { categories: CategoryOption[] }) {
  const params = useSearchParams();
  const activeType = params.get("type") ?? "all";

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide mx-[-4px] px-[4px]">
      {categories.map((cat) => {
        const isActive = activeType === cat.key;

        // When switching category, CLEAR all other filters:
        // genre, author, vibe, theme, colour, page
        const base = new URLSearchParams();

        if (cat.key !== "all") base.set("type", cat.key);

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
