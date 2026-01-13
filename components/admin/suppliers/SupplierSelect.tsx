"use client";

import { useEffect, useState } from "react";

export type Supplier = {
  id: string;
  name: string;
};

type Props = {
  value: string | null;
  onChange: (supplier: Supplier) => void;
};

export default function SupplierSelect({ value, onChange }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetch("/api/admin/suppliers", {
          cache: "no-store",
        });

        const data = await res.json();

        if (Array.isArray(data)) {
          setSuppliers(data);
        } else {
          console.error("❌ suppliers API returned non-array", data);
          setSuppliers([]);
        }
      } catch (err) {
        console.error("❌ failed to load suppliers", err);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    }

    loadSuppliers();
  }, []);

  return (
    <select
      className="w-full border rounded px-3 py-2 text-sm"
      value={value ?? ""}
      disabled={loading}
      onChange={(e) => {
        const selected = suppliers.find(
          (s) => s.id === e.target.value
        );
        if (selected) onChange(selected);
      }}
    >
      <option value="">
        {loading ? "Loading suppliers…" : "Select supplier…"}
      </option>

      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
