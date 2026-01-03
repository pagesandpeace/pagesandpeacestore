import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
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
   COMPONENT
--------------------------------------------------- */

export default async function GardnersLastImportCard() {
  const supabase = await supabaseServer();

  const { data: batch } = await supabase
    .from("supplier_import_batches")
    .select(`
      id,
      status,
      uploaded_at,
      valid_rows,
      new_records,
      unchanged_records,
      price_changes,
      inserted_records,
      updated_price_records
    `)
    .eq("supplier", "gardners")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!batch) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-neutral-600">
        <p className="font-semibold mb-1">Last Gardners Import</p>
        <p>No imports have been run yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Last Gardners Import</p>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
            batch.status
          )}`}
        >
          {batch.status}
        </span>
      </div>

      <p className="text-sm text-neutral-600">
        Uploaded{" "}
        <strong>
          {new Date(batch.uploaded_at).toLocaleString("en-GB")}
        </strong>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
        <div>
          <p className="text-neutral-500">Valid rows</p>
          <p className="font-semibold">{batch.valid_rows ?? "—"}</p>
        </div>

        <div>
          <p className="text-neutral-500">New records</p>
          <p className="font-semibold">{batch.new_records ?? 0}</p>
        </div>

        <div>
          <p className="text-neutral-500">Price changes</p>
          <p className="font-semibold">{batch.price_changes ?? 0}</p>
        </div>

        <div>
          <p className="text-neutral-500">Inserted / Updated</p>
          <p className="font-semibold">
            {batch.inserted_records ?? 0} / {batch.updated_price_records ?? 0}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <Link href="/admin/suppliers/history">
          <Button size="sm" variant="neutral">
            View full import history
          </Button>
        </Link>
      </div>
    </div>
  );
}
