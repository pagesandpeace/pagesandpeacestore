import Link from "next/link";

export default function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | number | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-4 text-sm">
      <p className="text-foreground/60">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded-lg border px-3 py-2 font-medium hover:bg-[#f8f5f1]">
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border px-3 py-2 text-foreground/35">Previous</span>
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="rounded-lg border px-3 py-2 font-medium hover:bg-[#f8f5f1]">
            Next
          </Link>
        ) : (
          <span className="rounded-lg border px-3 py-2 text-foreground/35">Next</span>
        )}
      </div>
    </div>
  );
}
