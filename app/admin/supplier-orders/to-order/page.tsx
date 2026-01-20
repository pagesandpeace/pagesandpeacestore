"use client";

import { useCallback, useEffect, useState } from "react";

import ToBeOrderedTable from "@/components/admin/supplier-orders/tables/ToBeOrderedTable";
import CreateSupplierPOModal from "@/components/admin/supplier-orders/CreateSupplierPOModal";

import type { SupplierOrderGroup } from "@/components/admin/supplier-orders/types";

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function groupHasToOrder(group: SupplierOrderGroup) {
  return group.customers.some((c) =>
    c.items.some(
      (item) =>
        item.ordered_at == null &&
        item.cancelled_at == null
    )
  );
}

export default function SupplierOrdersToOrderPage() {
  const [data, setData] = useState<SupplierOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreatePO, setShowCreatePO] = useState(false);

  /* ---------------------------------------------
     LOAD
  --------------------------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/supplier-orders", {
        cache: "no-store",
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------
     SELECTION
  --------------------------------------------- */

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  /* ---------------------------------------------
     FILTER VISIBLE GROUPS
  --------------------------------------------- */

  const visibleGroups = data.filter(groupHasToOrder);

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------
         HEADER + BULK ACTION
      --------------------------------------------- */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Orders to be placed
        </h1>

        <button
          disabled={selected.size === 0}
          onClick={() => setShowCreatePO(true)}
          className="px-4 py-2 text-sm bg-black text-white rounded disabled:opacity-40"
        >
          Create supplier PO ({selected.size})
        </button>
      </div>

      {/* ---------------------------------------------
         EMPTY STATE
      --------------------------------------------- */}
      {visibleGroups.length === 0 && (
        <div className="rounded-lg border bg-gray-50 p-6 text-sm text-gray-600">
          No supplier orders waiting to be placed.
        </div>
      )}

      {/* ---------------------------------------------
         GROUPS
      --------------------------------------------- */}
      {visibleGroups.map((group) => (
        <div
          key={group.po_id ?? group.created_at}
          className="border rounded-lg bg-white p-5"
        >
          <ToBeOrderedTable
            group={group}
            selected={selected}
            onToggle={toggleSelect}
            onRefresh={load}
          />
        </div>
      ))}

      {/* ---------------------------------------------
         CREATE PO MODAL
      --------------------------------------------- */}
      <CreateSupplierPOModal
        open={showCreatePO}
        backorderIds={Array.from(selected)}
        onClose={() => setShowCreatePO(false)}
        onCreated={() => {
          setShowCreatePO(false);
          clearSelection();
          load();
        }}
      />
    </div>
  );
}
