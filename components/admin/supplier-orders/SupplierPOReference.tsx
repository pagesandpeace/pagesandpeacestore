"use client";

type Props = {
  poNumber: string | null;
};

export default function SupplierPOReference({ poNumber }: Props) {
  // Hide entirely if no PO number (e.g. "To be ordered" tab)
  if (!poNumber) return null;

  return (
    <div className="flex items-center gap-2 text-sm mt-1">
      <span className="text-gray-500">Supplier PO:</span>
      <span className="font-medium text-black">{poNumber}</span>
    </div>
  );
}
