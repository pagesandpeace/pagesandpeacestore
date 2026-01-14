"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  page: number;
  totalPages: number;
};

export function TablePagination({ page, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    if (nextPage === page) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));

    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="text-foreground/60">
        Page {page} of {totalPages}
      </div>

      <div className="flex gap-3">
        {page > 1 && (
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            className="text-accent hover:underline"
          >
            Previous
          </button>
        )}

        {page < totalPages && (
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            className="text-accent hover:underline"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
