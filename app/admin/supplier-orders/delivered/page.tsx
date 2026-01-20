"use client";

import { useCallback, useEffect, useState } from "react";

import OrderHeader from "@/components/admin/supplier-orders/OrderHeader";
import DeliveredTable from "@/components/admin/supplier-orders/tables/DeliveredTable";

import type { SupplierOrderGroup } from "@/components/admin/supplier-orders/types";

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function groupHasDelivered(group: SupplierOrderGroup) {
  return group.customers.some((c) =>
    c.items.some((item) => {
      const received = item.received_quantity ?? 0;

      return (
        received > 0 &&
        item.collected_at == null &&
        item.cancelled_at == null
      );
    })
  );
}

export default function SupplierOrdersDeliveredPage() {
  const [data, setData] = useState<SupplierOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ---------------------------------------------
     LOAD DATA
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

  /* ---------------------------------------------
     FILTER VISIBLE GROUPS
  --------------------------------------------- */

  const visibleGroups = data.filter(groupHasDelivered);

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------
         EMPTY STATE
      --------------------------------------------- */}
      {!loading && visibleGroups.length === 0 && (
        <div className="rounded-lg border bg-gray-50 p-6 text-sm text-gray-600">
          No delivered supplier orders awaiting collection.
        </div>
      )}

      {/* ---------------------------------------------
         GROUPS
      --------------------------------------------- */}
      {visibleGroups.map((group) => {
        const allItems = group.customers.flatMap((c) => c.items);

        const orderedAt =
          group.ordered_at ??
          allItems
            .map((i) => i.ordered_at)
            .filter(Boolean)
            .sort()[0] ??
          null;

        const receivedAt =
          allItems
            .map((i) => i.received_at)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null;

        return (
          <div
            key={group.po_id ?? group.created_at}
            className="border rounded-lg bg-white p-5 space-y-4"
          >
            {/* ---------------------------------------------
               CARD HEADER + TIMELINE
            --------------------------------------------- */}
            <OrderHeader
              orderDate={group.created_at}
              createdAt={group.created_at}
              orderedAt={orderedAt}
              receivedAt={receivedAt}
              poNumber={group.po_number}
              showBulkButton={false}
              bulkButtonLabel=""
              bulkDisabled
              onBulkClick={() => {}}
            />

            {/* ---------------------------------------------
               TABLE
            --------------------------------------------- */}
            <DeliveredTable
              group={group}
              selected={selected}
              onToggle={toggleSelect}
              onRefresh={load}
            />
          </div>
        );
      })}
    </div>
  );
}
