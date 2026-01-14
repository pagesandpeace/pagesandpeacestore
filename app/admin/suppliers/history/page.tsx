import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

import { Button } from "@/components/ui/Button";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { HeadCell } from "@/components/table/HeadCell";
import { Cell } from "@/components/table/Cell";

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */

function statusBadge(status: string) {
  switch (status) {
    case "applied":
      return "bg-green-100 text-green-700 border border-green-300";
    case "diffed":
      return "bg-amber-100 text-amber-700 border border-amber-300";
    case "uploaded":
      return "bg-gray-100 text-gray-700 border border-gray-300";
    case "failed":
      return "bg-red-100 text-red-700 border border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border";
  }
}

/* ---------------------------------------------------
   PAGE
--------------------------------------------------- */

export default async function SupplierImportHistoryPage() {
  const supabase = await supabaseServer();

  const { data: batches, error } = await supabase
    .from("supplier_import_batches")
    .select(`
      id,
      supplier,
      status,
      uploaded_at,
      valid_rows,
      new_records,
      unchanged_records,
      price_changes,
      inserted_records,
      updated_price_records
    `)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-6xl mx-auto py-10 space-y-6">
        <h1 className="text-3xl font-bold">Supplier Import History</h1>

        <p className="text-red-600">
          Failed to load supplier import history.
        </p>

        <Link href="/admin">
          <Button variant="neutral">Back to Admin</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-10 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier Import History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit log of all catalogue imports across suppliers
          </p>
        </div>

        <Link href="/admin/suppliers/gardners">
          <Button variant="neutral">Back to Gardners</Button>
        </Link>
      </div>

      {/* TABLE */}
      <TableSurface>
        <Table>
          <TableHead>
            <tr>
              <HeadCell>Supplier</HeadCell>
              <HeadCell>Uploaded</HeadCell>
              <HeadCell>Status</HeadCell>
              <HeadCell align="right">Valid</HeadCell>
              <HeadCell align="right">New</HeadCell>
              <HeadCell align="right">Price Δ</HeadCell>
              <HeadCell align="right">Inserted</HeadCell>
              <HeadCell align="right">Updated</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {batches.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <span className="text-muted-foreground">
                    No supplier imports recorded yet.
                  </span>
                </td>
              </tr>
            )}

            {batches.map((b) => (
              <TableRow key={b.id}>
                <Cell strong>
                  <span className="capitalize">
                    {b.supplier}
                  </span>
                </Cell>

                <Cell>
                  <span className="text-muted-foreground">
                    {new Date(b.uploaded_at).toLocaleString("en-GB")}
                  </span>
                </Cell>

                <Cell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
                      b.status
                    )}`}
                  >
                    {b.status}
                  </span>
                </Cell>

                <Cell align="right">{b.valid_rows ?? "—"}</Cell>
                <Cell align="right">{b.new_records ?? 0}</Cell>
                <Cell align="right">{b.price_changes ?? 0}</Cell>
                <Cell align="right">{b.inserted_records ?? 0}</Cell>
                <Cell align="right">{b.updated_price_records ?? 0}</Cell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableSurface>
    </main>
  );
}
