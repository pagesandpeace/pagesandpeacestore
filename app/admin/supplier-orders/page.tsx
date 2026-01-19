"use client";

import { useCallback, useEffect, useState } from "react";

import OrderHeader from "@/components/admin/supplier-orders/OrderHeader";
import ToBeOrderedTable from "@/components/admin/supplier-orders/tables/ToBeOrderedTable";
import AwaitingDeliveryTable from "@/components/admin/supplier-orders/tables/AwaitingDeliveryTable";
import DeliveredTable from "@/components/admin/supplier-orders/tables/DeliveredTable";
import CreateSupplierPOModal from "@/components/admin/supplier-orders/CreateSupplierPOModal";

import type { SupplierOrderGroup } from "@/components/admin/supplier-orders/types";

/* ---------------------------------------------
   TAB KEYS
--------------------------------------------- */

type TabKey = "to_order" | "awaiting_delivery" | "delivered";

/* ---------------------------------------------
   GROUP VISIBILITY
--------------------------------------------- */

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
          return received > 0 && item.cancelled_at == null;

        default:
          return false;
      }
    })
  );
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function SupplierOrdersPage() {
  const [data, setData] = useState<SupplierOrderGroup[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("to_order");
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  useEffect(() => {
    clearSelection();
  }, [activeTab]);

  /* ---------------------------------------------
     BULK ACTIONS
  --------------------------------------------- */

  const submitBulk = async () => {
    if (selected.size === 0) return;

    if (activeTab === "to_order") {
      setShowCreatePO(true);
      return;
    }

    if (activeTab === "awaiting_delivery") {
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
    activeTab === "to_order"
      ? `Create supplier PO (${selected.size})`
      : activeTab === "awaiting_delivery"
      ? `Mark received (${selected.size})`
      : "";

  const showBulkButton = activeTab !== "delivered";

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Supplier Orders</h1>

      <Tabs active={activeTab} onChange={setActiveTab} />

      {loading && (
        <p className="text-sm text-gray-500">Loading…</p>
      )}

      {!loading &&
        data.filter((g) => groupHasRows(g, activeTab)).length === 0 && (
          <p className="text-sm text-gray-500">
            No orders in this state.
          </p>
        )}

      {data
        .filter((group) => groupHasRows(group, activeTab))
        .map((group) => {
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
                orderDate={
                  activeTab === "to_order"
                    ? group.created_at
                    : orderedAt ?? group.created_at
                }
                createdAt={activeTab === "to_order" ? null : group.created_at}
                orderedAt={activeTab === "to_order" ? null : orderedAt}
                receivedAt={activeTab === "delivered" ? receivedAt : null}
                poNumber={activeTab === "to_order" ? null : group.po_number}
                showBulkButton={showBulkButton}
                bulkButtonLabel={bulkButtonLabel}
                bulkDisabled={selected.size === 0}
                onBulkClick={submitBulk}
              />

              {activeTab === "to_order" && (
                <ToBeOrderedTable
                  group={group}
                  selected={selected}
                  onToggle={toggleSelect}
                  onRefresh={load}
                />
              )}

              {activeTab === "awaiting_delivery" && (
                <AwaitingDeliveryTable
                  group={group}
                  selected={selected}
                  onToggle={toggleSelect}
                  onRefresh={load}
                />
              )}

              {activeTab === "delivered" && (
  <DeliveredTable
    group={group}
    selected={selected}
    onToggle={toggleSelect}
    onRefresh={load}   // ✅ THIS IS THE FIX
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

/* ---------------------------------------------
   TABS
--------------------------------------------- */

function Tabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="flex gap-2 border-b pb-2">
      <Tab
        label="To be ordered"
        active={active === "to_order"}
        onClick={() => onChange("to_order")}
      />
      <Tab
        label="Awaiting delivery"
        active={active === "awaiting_delivery"}
        onClick={() => onChange("awaiting_delivery")}
      />
      <Tab
        label="Delivered"
        active={active === "delivered"}
        onClick={() => onChange("delivered")}
      />
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 transition ${
        active
          ? "border-black font-medium"
          : "border-transparent text-gray-500 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}
