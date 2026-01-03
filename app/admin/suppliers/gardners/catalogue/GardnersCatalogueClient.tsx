"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import Link from "next/link";

type Row = {
  id: string;
  supplier: string;
  supplier_ref: string;
  title: string;
  display_title: string;
  author: string | null;
  binding: string | null;
  supplier_price: number;
  rank_pos: number | null;

  product_supplier_links?: {
    id: string;
    product_id: string;
  }[] | null;
};

export default function GardnersCatalogueClient({
  rows,
  page,
  pageSize,
  total,
  search,
}: {
  rows: Row[];
  page: number;
  pageSize: number;
  total: number;
  search: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [loadingRef, setLoadingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(search);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* -------------------------------------------
     URL UPDATE
  ------------------------------------------- */
  const update = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());

    if (!value) q.delete(key);
    else q.set(key, value);

    q.set("page", "1");
    router.push(`/admin/suppliers/gardners/catalogue?${q.toString()}`);
  };

  /* -------------------------------------------
     CREATE PRODUCT
  ------------------------------------------- */
  async function handleCreate(row: Row) {
    const confirmed = confirm(
      `Create catalogue product?\n\n${row.display_title}\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setLoadingRef(row.supplier_ref);
    setError(null);

    try {
      const res = await fetch("/api/admin/catalogue/create-from-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplier: row.supplier,
          supplier_ref: row.supplier_ref,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Create failed");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoadingRef(null);
    }
  }

  /* -------------------------------------------
     RENDER
  ------------------------------------------- */
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gardners Supplier Catalogue</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4 text-sm text-muted-foreground">
          <p>
            Promote supplier titles into your catalogue.
            Once linked, a supplier title cannot be promoted again.
          </p>

          <input
            className="border px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D6C28B]"
            placeholder="Search title, author, ISBN…"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              update("search", e.target.value || null);
            }}
          />
        </CardBody>
      </Card>

      {error && <Alert type="error" message={error} />}

      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f6f3ef] border-b">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3 text-right">Supplier £</th>
              <th className="px-4 py-3 text-right">Rank</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  No supplier titles match this filter.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const link =
                row.product_supplier_links &&
                row.product_supplier_links.length > 0
                  ? row.product_supplier_links[0]
                  : null;

              return (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-[#faf6f1]"
                >
                  <td className="px-4 py-3 font-medium">
                    {row.display_title}
                  </td>
                  <td className="px-4 py-3">{row.author ?? "—"}</td>
                  <td className="px-4 py-3">{row.binding ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    £{row.supplier_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.rank_pos ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    {link ? (
                      <Badge color="green">Linked</Badge>
                    ) : (
                      <Badge color="neutral">Unlinked</Badge>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {link ? (
                      <Link
                        href={`/admin/products/${link.product_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View product →
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        disabled={loadingRef === row.supplier_ref}
                        onClick={() => handleCreate(row)}
                      >
                        {loadingRef === row.supplier_ref
                          ? "Creating…"
                          : "Create product"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>
          Page {page} of {totalPages} · {total} titles
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="neutral"
            disabled={page <= 1}
            onClick={() =>
              router.push(
                `/admin/suppliers/gardners/catalogue?page=${page - 1}&search=${encodeURIComponent(
                  search
                )}`
              )
            }
          >
            Previous
          </Button>

          <Button
            size="sm"
            variant="neutral"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `/admin/suppliers/gardners/catalogue?page=${page + 1}&search=${encodeURIComponent(
                  search
                )}`
              )
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
