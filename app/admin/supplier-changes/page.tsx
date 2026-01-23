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
      status,
      products (
        id,
        name,
        slug
      )
    `)
    .eq("status", "pending")
    .order("detected_at", { ascending: false });

  if (error) {
    return (
      <p className="p-6 text-red-600">
        Failed to load supplier changes.
      </p>
    );
  }

  return (
    <main className="p-6 space-y-6">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Reference Changes</CardTitle>
        </CardHeader>

        <CardBody className="space-y-3 text-sm text-muted-foreground">
          <p>
            Changes detected from supplier data feeds (e.g. Gardners).
          </p>

          <p>
            These alerts indicate a change to the <strong>publisher
            recommended retail price (RRP)</strong> or other reference
            metadata.
          </p>

          <p>
            <strong>No selling prices are changed automatically.</strong>{" "}
            Review each product and decide whether you want to update
            your store price.
          </p>
        </CardBody>
      </Card>

      {/* TABLE */}
      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3">Change type</th>
              <th className="px-4 py-3">Previous</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Detected</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {changes?.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-neutral-500"
                >
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
                  <Badge>
                    {c.field === "rrp" ? "RRP update" : c.field}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  {c.old_value
                    ? `£${Number(c.old_value).toFixed(2)}`
                    : "—"}
                </td>

                <td className="px-4 py-3 font-semibold">
                  £{Number(c.new_value).toFixed(2)}
                </td>

                <td className="px-4 py-3 text-xs text-neutral-500">
                  {new Date(c.detected_at).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-right">
                  <form
                    action={`/api/admin/supplier-changes/${c.id}/view`}
                    method="post"
                  >
                    <Button size="sm">
                      Review product
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
