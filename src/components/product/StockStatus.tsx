export default function StockStatus({
  count,
}: {
  count: number | null | undefined;
}) {
  if (count === null || count === undefined) return null;

  if (count === 0) {
    return (
      <p className="text-sm font-medium text-red-600">
        Out of stock
      </p>
    );
  }

  if (count <= 3) {
    return (
      <p className="text-sm font-medium text-amber-600">
        Only {count} left — very limited!
      </p>
    );
  }

  return (
    <p className="text-sm text-[var(--foreground)]/60">
      In stock — {count} available
    </p>
  );
}
