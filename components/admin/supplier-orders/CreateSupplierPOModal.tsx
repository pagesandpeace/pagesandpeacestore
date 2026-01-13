"use client";

import { useState } from "react";
import SupplierSelect from "@/components/admin/suppliers/SupplierSelect";

export default function CreateSupplierPOModal({
  open,
  backorderIds,
  onClose,
  onCreated,
}: {
  open: boolean;
  backorderIds: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!supplierId) return;

    setLoading(true);

    await fetch("/api/admin/supplier-pos/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: supplierId,
        backorder_ids: backorderIds,
      }),
    });

    setLoading(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium">Create Supplier PO</h2>

        <SupplierSelect
          value={supplierId}
          onChange={(s) => setSupplierId(s.id)}
        />

        <p className="text-xs text-gray-500">
          {backorderIds.length} items will be attached.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !supplierId}
            className="bg-black text-white px-3 py-2 rounded disabled:opacity-40"
          >
            Create PO
          </button>
        </div>
      </div>
    </div>
  );
}
