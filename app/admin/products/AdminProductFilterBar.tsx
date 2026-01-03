"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminProductFilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const status = params.get("status") ?? "all";

  const update = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());

    if (!value || value === "all") q.delete(key);
    else q.set(key, value);

    q.set("page", "1");
    router.push(`/admin/products?${q.toString()}`);
  };

  const inputClass =
    "border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#D6C28B]";

  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row gap-4">
      {/* SEARCH */}
      <input
        className={inputClass}
        placeholder="Search products…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          update("search", e.target.value);
        }}
      />

      {/* STATUS FILTER */}
      <select
        className={inputClass}
        value={status}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="out">Out of stock</option>
        <option value="made_to_order">Made to order</option>
        <option value="low">Low stock</option>
        <option value="in_stock">In stock</option>
      </select>
    </div>
  );
}
