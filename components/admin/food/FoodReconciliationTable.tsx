"use client";

import { useMemo, useState } from "react";
import BulkClassifyModal from "@/components/admin/food/BulkClassifyModal";
import FoodReconciliationDetailsModal from "@/components/admin/food/FoodReconciliationDetailsModal";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { HeadCell } from "@/components/table/HeadCell";
import { Cell } from "@/components/table/Cell";

import type { GroupedRow, RowStatus } from "@/types/food-reconciliation";

/* ======================================================
   TYPES
====================================================== */

type Props = {
  grouped: GroupedRow[];
};

type GroupStatus = RowStatus | "mixed";

/* ======================================================
   HELPERS
====================================================== */

function getGroupStatus(group: GroupedRow): GroupStatus {
  const statuses = group.rows.map((r) => r.status);

  if (statuses.every((s) => s === "unclassified")) return "unclassified";
  if (statuses.every((s) => s === "classified")) return "classified";
  if (statuses.every((s) => s === "ignored")) return "ignored";

  return "mixed";
}

const STATUS_ORDER: Record<GroupStatus, number> = {
  unclassified: 0,
  mixed: 1,
  classified: 2,
  ignored: 3,
};

/* ======================================================
   COMPONENT
====================================================== */

export default function FoodReconciliationTable({ grouped }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openGroup, setOpenGroup] = useState<GroupedRow | null>(null);

  /* -------------------------------
     SORT (status used internally)
  -------------------------------- */

  const rows = useMemo(() => {
    return [...grouped]
      .map((g) => ({
        ...g,
        status: getGroupStatus(g),
      }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [grouped]);

  /* -------------------------------
     SELECTION
  -------------------------------- */

  function toggle(rawName: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(rawName)) {
        next.delete(rawName);
      } else {
        next.add(rawName);
      }

      return next;
    });
  }

  const selectedSalesEventIds = rows
    .filter((g) => selected.has(g.raw_name))
    .flatMap((g) => g.rows.map((r) => r.id));

  async function bulkIgnore() {
    if (selectedSalesEventIds.length === 0) return;

    await fetch("/api/admin/food/bulk-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesEventIds: selectedSalesEventIds,
        ignored: true,
      }),
    });

    window.location.reload();
  }

  /* -------------------------------
     RENDER
  -------------------------------- */

  return (
    <>
      <TableSurface>
        {selectedSalesEventIds.length > 0 ? (
          <div className="mb-3">
            <button
              onClick={bulkIgnore}
              className="px-3 py-1 text-xs rounded bg-red-100 text-red-800"
            >
              🚫 Ignore selected ({selectedSalesEventIds.length})
            </button>
          </div>
        ) : null}

        <Table>
          <TableHead>
            <TableRow>
              <HeadCell>&nbsp;</HeadCell>
              <HeadCell>Description</HeadCell>
              <HeadCell align="right">Events</HeadCell>
              <HeadCell align="right">Units</HeadCell>
              <HeadCell>Actions</HeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((group) => (
              <TableRow key={group.raw_name}>
                <Cell>
                  <input
                    type="checkbox"
                    checked={selected.has(group.raw_name)}
                    onChange={() => toggle(group.raw_name)}
                  />
                </Cell>

                <Cell strong>{group.raw_name}</Cell>

                <Cell align="right">{group.eventCount}</Cell>
                <Cell align="right">{group.unitCount}</Cell>

                <Cell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpenGroup(group)}
                      className="text-xs underline text-blue-600"
                    >
                      See details
                    </button>

                    {(group.status === "unclassified" ||
                      group.status === "mixed") && (
                      <BulkClassifyModal
                        rawName={group.raw_name}
                        salesEventIds={group.rows.map((r) => r.id)}
                      />
                    )}
                  </div>
                </Cell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableSurface>

      {openGroup ? (
        <FoodReconciliationDetailsModal
          group={openGroup}
          onClose={() => setOpenGroup(null)}
        />
      ) : null}
    </>
  );
}
