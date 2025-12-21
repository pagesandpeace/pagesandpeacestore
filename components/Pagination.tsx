"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  function goTo(p: number) {
    const query = new URLSearchParams(params.toString());
    query.set("page", String(p));
    router.push(`/shop?${query.toString()}`);
  }

  return (
    <div className="flex justify-center mt-12 gap-3">
      {[...Array(pages)].map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => goTo(p)}
            className={`px-4 py-2 rounded-md border ${
              p === page
                ? "bg-accent text-white border-accent"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
