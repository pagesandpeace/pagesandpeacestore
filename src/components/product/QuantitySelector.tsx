"use client";

export default function QuantitySelector({
  qty,
  setQty,
}: {
  qty: number;
  setQty: (qty: number) => void;
}) {
  const update = (newQty: number) => {
    if (newQty < 1) return;
    setQty(newQty);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => update(qty - 1)}
        className="px-3 py-1 rounded-full border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10"
      >
        –
      </button>

      <span className="text-lg font-medium w-8 text-center">{qty}</span>

      <button
        onClick={() => update(qty + 1)}
        className="px-3 py-1 rounded-full border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10"
      >
        +
      </button>
    </div>
  );
}
