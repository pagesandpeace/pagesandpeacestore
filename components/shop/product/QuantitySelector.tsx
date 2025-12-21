"use client";

type Props = {
  qty: number;
  setQty: (qty: number) => void;
  max?: number; // ← NEW
};

export default function QuantitySelector({ qty, setQty, max }: Props) {
  function increment() {
    if (max !== undefined && qty >= max) return; // prevent exceeding stock
    setQty(qty + 1);
  }

  function decrement() {
    if (qty > 1) setQty(qty - 1);
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        type="button"
        onClick={decrement}
        className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 text-lg"
      >
        –
      </button>

      <span className="text-lg font-medium w-8 text-center">{qty}</span>

      <button
        type="button"
        onClick={increment}
        className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 text-lg"
      >
        +
      </button>
    </div>
  );
}
