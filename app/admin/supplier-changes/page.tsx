export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function SupplierChangesPage() {
  const supabase = await supabaseServer();

  const { data: changes, error } = await supabase
    .from("supplier_changes")
    .select(`
      id,
      field,
      old_value,
      new_value,
      detected_at,
      product_id,
      products (
        id,
        name,
        slug
      )
    `)
    .eq("status", "pending")
    .order("detected_at", { ascending: false });

  if (error) {
    return <p className="p-6 text-red-600">Failed to load supplier changes.</p>;
  }

  return (
    <main className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Changes</CardTitle>
        </CardHeader>

        <CardBody className="space-y-4 text-sm text-muted-foreground">
          <p>
            Supplier-detected changes that require admin approval before
            affecting live catalogue products.
          </p>
        </CardBody>
      </Card>

      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Old</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Detected</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {changes?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No pending supplier changes.
                </td>
              </tr>
            )}

            {changes?.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">
                  {c.products?.[0]?.name ?? "Unknown product"}
                </td>

                <td className="px-4 py-3">
                  <Badge>{c.field}</Badge>
                </td>

                <td className="px-4 py-3">{c.old_value ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{c.new_value}</td>

                <td className="px-4 py-3 text-xs text-neutral-500">
                  {new Date(c.detected_at).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right space-x-2">
                  <form
                    action={`/api/admin/supplier-changes/${c.id}/accept`}
                    method="post"
                  >
                    <Button size="sm">Accept</Button>
                  </form>

                  <form
                    action={`/api/admin/supplier-changes/${c.id}/reject`}
                    method="post"
                  >
                    <Button size="sm" variant="neutral">
                      Reject
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
