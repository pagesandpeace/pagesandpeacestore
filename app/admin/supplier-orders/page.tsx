"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import OrderHeader from "@/components/admin/supplier-orders/OrderHeader";
import ToBeOrderedTable from "@/components/admin/supplier-orders/tables/ToBeOrderedTable";
import AwaitingDeliveryTable from "@/components/admin/supplier-orders/tables/AwaitingDeliveryTable";
import DeliveredTable from "@/components/admin/supplier-orders/tables/DeliveredTable";
import CreateSupplierPOModal from "@/components/admin/supplier-orders/CreateSupplierPOModal";

import type { SupplierOrderGroup } from "@/components/admin/supplier-orders/types";

type TabKey = "to_order" | "awaiting_delivery" | "delivered";

function groupHasRows(group: SupplierOrderGroup, tab: TabKey): boolean {
  return group.customers.some((c) =>
    c.items.some((item) => {
      const received = item.received_quantity ?? 0;
      const remaining = item.quantity - received;

      switch (tab) {
        case "to_order":
          return item.ordered_at == null && item.cancelled_at == null;

        case "awaiting_delivery":
          return (
            item.ordered_at != null &&
            remaining > 0 &&
            item.cancelled_at == null
          );

        case "delivered":
          return (
            received > 0 &&
            item.collected_at == null && // ✅ EXCLUDE collected
            item.cancelled_at == null
          );

        default:
          return false;
      }
    })
  );
}

export default function SupplierOrdersClient({ tab }: { tab: TabKey }) {
  const [data, setData] = useState<SupplierOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreatePO, setShowCreatePO] = useState(false);

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

  // Clear selection when tab changes (now comes from props)
  useEffect(() => {
    setSelected(new Set());
  }, [tab]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const submitBulk = async () => {
    if (selected.size === 0) return;

    if (tab === "to_order") {
      setShowCreatePO(true);
      return;
    }

    if (tab === "awaiting_delivery") {
      await fetch("/api/admin/backorders/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: "received",
        }),
      });

      clearSelection();
      load();
    }
  };

  const bulkButtonLabel =
    tab === "to_order"
      ? `Create supplier PO (${selected.size})`
      : tab === "awaiting_delivery"
      ? `Mark received (${selected.size})`
      : "";

  const showBulkButton = tab !== "delivered";

  const visibleGroups = useMemo(
    () => data.filter((g) => groupHasRows(g, tab)),
    [data, tab]
  );

  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && visibleGroups.length === 0 && (
        <p className="text-sm text-gray-500">No orders in this state.</p>
      )}

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
            <OrderHeader
              orderDate={tab === "to_order" ? group.created_at : orderedAt ?? group.created_at}
              createdAt={tab === "to_order" ? null : group.created_at}
              orderedAt={tab === "to_order" ? null : orderedAt}
              receivedAt={tab === "delivered" ? receivedAt : null}
              poNumber={tab === "to_order" ? null : group.po_number}
              showBulkButton={showBulkButton}
              bulkButtonLabel={bulkButtonLabel}
              bulkDisabled={selected.size === 0}
              onBulkClick={submitBulk}
            />

            {tab === "to_order" && (
              <ToBeOrderedTable
                group={group}
                selected={selected}
                onToggle={toggleSelect}
                onRefresh={load}
              />
            )}

            {tab === "awaiting_delivery" && (
              <AwaitingDeliveryTable
                group={group}
                selected={selected}
                onToggle={toggleSelect}
                onRefresh={load}
              />
            )}

            {tab === "delivered" && (
              <DeliveredTable
                group={group}
                selected={selected}
                onToggle={toggleSelect}
                onRefresh={load}
              />
            )}
          </div>
        );
      })}

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
