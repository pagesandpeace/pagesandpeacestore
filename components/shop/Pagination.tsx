"use client";

import { useRouter, useSearchParams } from "next/navigation";

/* ------------------------------------------
   TYPES
------------------------------------------ */

type PaginationProps = {
  page: number;
  total: number;
  pageSize: number;
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

export default function Pagination({
  page,
  total,
  pageSize,
}: PaginationProps) {
  const router = useRouter();
  const params = useSearchParams();

  const totalPages = Math.ceil(total / pageSize);

  const go = (p: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    router.push(`/shop?${q.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex gap-3 justify-center mt-10">
      {page > 1 && (
        <button
          onClick={() => go(page - 1)}
          className="px-4 py-2 border rounded"
        >
          Prev
        </button>
      )}

      <span className="px-4 py-2 font-semibold">
        {page} / {totalPages}
      </span>

      {page < totalPages && (
        <button
          onClick={() => go(page + 1)}
          className="px-4 py-2 border rounded"
        >
          Next
        </button>
      )}
    </div>
  );
}
