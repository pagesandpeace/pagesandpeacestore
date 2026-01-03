"use client";

import { Input } from "@/components/ui/Input";

type SupplierLinkSectionProps = {
  supplier: string;
  supplierRef: string;
  onChange: (key: "supplier" | "supplier_ref", value: string) => void;
};

export default function SupplierLinkSection({
  supplier,
  supplierRef,
  onChange,
}: SupplierLinkSectionProps) {
  return (
    <div className="border rounded-lg p-4 bg-neutral-50 space-y-3">
      <h3 className="text-sm font-semibold text-neutral-700">
        Supplier (optional)
      </h3>

      <select
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={supplier}
        onChange={(e) => onChange("supplier", e.target.value)}
      >
        <option value="">— Select supplier —</option>
        <option value="gardners">Gardners</option>
        <option value="ingram">Ingram</option>
      </select>

      <Input
        placeholder="Supplier reference (ISBN / SKU)"
        value={supplierRef}
        onChange={(e) => onChange("supplier_ref", e.target.value)}
      />

      <p className="text-xs text-neutral-500">
        Used for supplier matching and monthly uploads.  
        Does not affect pricing automatically.
      </p>
    </div>
  );
}
