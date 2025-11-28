"use client";

import { Button } from "@/components/ui/Button";

export default function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex gap-4 justify-center mt-6 items-center">
      <Button
        variant="outline"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </Button>

      <span>
        Page {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}
