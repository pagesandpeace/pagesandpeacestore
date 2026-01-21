/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import BulkClassifyModal from "@/components/admin/food/BulkClassifyModal";

/* table system */
import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { HeadCell } from "@/components/table/HeadCell";
import { Cell } from "@/components/table/Cell";
import { TablePagination } from "@/components/table/TablePagination";

/* ======================================================
   TYPES
====================================================== */

type RowStatus = "unclassified" | "classified" | "ignored";

export type NormalisedRow = {
  id: string;
  raw_name: string;
  quantity: number;
  status: RowStatus;
  category: string | null;
};

export type GroupedRow = {
  raw_name: string;
  rows: NormalisedRow[];
  eventCount: number;
  unitCount: number;
};

/* ======================================================
   HELPERS
====================================================== */

function getGroupStatus(group: GroupedRow) {
  const statuses = group.rows.map((r) => r.status);
  if (statuses.every((s) => s === "ignored")) return "ignored";
  if (statuses.every((s) => s === "classified")) return "classified";
  if (statuses.every((s) => s === "unclassified")) return "unclassified";
  return "mixed";
}

/* ======================================================
   COMPONENT
====================================================== */

const PAGE_SIZE = 20;

export default function FoodReconciliationTable({
  grouped,
}: {
  grouped: GroupedRow[];
}) {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ---------- pagination ---------- */

  const totalPages = Math.max(
    1,
    Math.ceil(grouped.length / PAGE_SIZE)
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return grouped.slice(start, start + PAGE_SIZE);
  }, [grouped, page]);

  /* ---------- selection ---------- */

  function toggle(rawName: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(rawName) ? next.delete(rawName) : next.add(rawName);
      return next;
    });
  }

  const selectedSalesEventIds = grouped
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

  /* ======================================================
     RENDER
  ====================================================== */

  return (
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
            <HeadCell>
              <span className="sr-only">Select</span>
            </HeadCell>
            <HeadCell>Description</HeadCell>
            <HeadCell align="right">Events</HeadCell>
            <HeadCell align="right">Units</HeadCell>
            <HeadCell>Status</HeadCell>
            <HeadCell>Action</HeadCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {pageRows.map((group) => {
            const status = getGroupStatus(group);

            return (
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
                  {status === "unclassified" && "🟡 Unclassified"}
                  {status === "classified" &&
                    `✅ Classified (${group.rows[0].category})`}
                  {status === "ignored" && "🚫 Ignored"}
                  {status === "mixed" && "🟠 Mixed"}
                </Cell>

                <Cell>
                  {status === "unclassified" || status === "mixed" ? (
                    <BulkClassifyModal
                      rawName={group.raw_name}
                      salesEventIds={group.rows.map((r) => r.id)}
                      triggerLabel={
                        status === "mixed"
                          ? "Fix classification"
                          : "Classify"
                      }
                      variant={
                        status === "mixed"
                          ? "warning"
                          : "default"
                      }
                    />
                  ) : status === "classified" ? (
                    <span className="text-xs text-green-700 font-medium">
                      ✓ Ready for stock
                    </span>
                  ) : null}
                </Cell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 ? (
        <div className="mt-4">
          <TablePagination
            page={page}
            totalPages={totalPages}
          />
        </div>
      ) : null}
    </TableSurface>
  );
}
