import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
        <Card>
          <CardHeader>
            <CardTitle>Supplier Import History</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-red-600">
              Failed to load supplier import history.
            </p>

            <Link href="/admin">
              <Button variant="neutral">Back to Admin</Button>
            </Link>
          </CardBody>
        </Card>
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

      {/* TABLE CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Import Batches</CardTitle>
        </CardHeader>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f6f3ef] border-b">
                <tr className="text-left">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Valid</th>
                  <th className="px-4 py-3 text-right">New</th>
                  <th className="px-4 py-3 text-right">Price Δ</th>
                  <th className="px-4 py-3 text-right">Inserted</th>
                  <th className="px-4 py-3 text-right">Updated</th>
                </tr>
              </thead>

              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No supplier imports recorded yet.
                    </td>
                  </tr>
                )}

                {batches.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b last:border-b-0 hover:bg-[#faf6f1]"
                  >
                    <td className="px-4 py-3 font-medium capitalize">
                      {b.supplier}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(b.uploaded_at).toLocaleString("en-GB")}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {b.valid_rows ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {b.new_records ?? 0}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {b.price_changes ?? 0}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {b.inserted_records ?? 0}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {b.updated_price_records ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
