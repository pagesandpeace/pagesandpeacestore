export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

import AdminProductFilterBar from "./AdminProductFilterBar";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { Cell } from "@/components/table/Cell";
import { HeadCell } from "@/components/table/HeadCell";
import { TableSearch } from "@/components/table/TableSearch";
import { TablePagination } from "@/components/table/TablePagination";

/* ------------------------------------
   TYPES
------------------------------------ */

type SearchParams = {
  q?: string;
  status?: string;
  product_type?: string;
  page?: string;
};

type ProductRow = {
  id: string;
  name: string;
  display_title: string | null;
  price: number;
  inventory_count: number | null;
  fulfilment_mode: "physical" | "made_to_order";
  product_type: string;
  created_at: string;
};

type StockMovement = {
  product_id: string;
  reason: string;
  created_at: string;
};

type ProductStatus = "out" | "made_to_order" | "low" | "in_stock";

const PAGE_SIZE = 20;

/* ------------------------------------
   STATUS LOGIC
------------------------------------ */

function deriveStatus(p: ProductRow): ProductStatus {
  if (p.fulfilment_mode === "made_to_order") return "made_to_order";

  const qty = p.inventory_count ?? 0;
  if (qty === 0) return "out";
  if (qty <= 3) return "low";
  return "in_stock";
}

function statusRank(status: ProductStatus) {
  return ["out", "made_to_order", "low", "in_stock"].indexOf(status);
}

function statusBadge(status: ProductStatus) {
  switch (status) {
    case "out":
      return { label: "Out of stock", color: "red" as const };
    case "made_to_order":
      return { label: "Made to order", color: "blue" as const };
    case "low":
      return { label: "Low stock", color: "yellow" as const };
    default:
      return { label: "In stock", color: "green" as const };
  }
}

/* ====================================
   PAGE
==================================== */

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await supabaseServer();
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const statusFilter = (params.status ?? "all") as ProductStatus | "all";
  const productType = params.product_type ?? "all";
  const page = Math.max(Number(params.page ?? 1), 1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  /* ------------------------------------
     BASE QUERY
  ------------------------------------ */

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .neq("product_type", "event") // HARD RULE: never show events
    .order("created_at", { ascending: false })
    .range(from, to);

  /* ------------------------------------
     PRODUCT TYPE FILTER
  ------------------------------------ */

  if (productType !== "all") {
    query = query.eq("product_type", productType);
  }

  /* ------------------------------------
     SEARCH (GIN-backed)
  ------------------------------------ */

  if (q.length >= 3) {
    query = query.ilike("search_text", `%${q.toLowerCase()}%`);
  }

  const { data: products, count, error } = await query;

  if (error || !products) {
    console.error("ADMIN PRODUCTS FETCH ERROR:", error);
    return null;
  }

  /* ------------------------------------
     LAST STOCK MOVEMENTS
  ------------------------------------ */

  const productIds = products.map((p) => p.id);

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("product_id, reason, created_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false });

  const lastMovementByProduct: Record<string, StockMovement> = {};

  movements?.forEach((m) => {
    if (!lastMovementByProduct[m.product_id]) {
      lastMovementByProduct[m.product_id] = m;
    }
  });

  /* ------------------------------------
     ENRICH + STATUS FILTER + SORT
  ------------------------------------ */

  const enriched = products
    .map((p: ProductRow) => ({
      ...p,
      status: deriveStatus(p),
      lastMovement: lastMovementByProduct[p.id] ?? null,
    }))
    .filter(
      (p) => statusFilter === "all" || p.status === statusFilter
    )
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));

  const totalPages = Math.max(
    Math.ceil((count ?? 0) / PAGE_SIZE),
    1
  );

  if (page > totalPages && totalPages > 0) {
    redirect(`/admin/products?page=${totalPages}`);
  }

  /* ------------------------------------
     RENDER
  ------------------------------------ */

  return (
    <main className="max-w-7xl mx-auto py-10 px-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-sm text-neutral-600">
            Inventory & fulfilment overview
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button>+ Add Product</Button>
        </Link>
      </div>

      {/* FILTERS */}
      <AdminProductFilterBar />

      {/* SEARCH */}
      <TableSearch placeholder="Search products…" />

      {/* TABLE */}
      <TableSurface>
        <Table>
          <TableHead>
            <tr>
              <HeadCell>Product</HeadCell>
              <HeadCell>Price</HeadCell>
              <HeadCell>Inventory</HeadCell>
              <HeadCell>Status</HeadCell>
              <HeadCell>Last movement</HeadCell>
              <HeadCell align="right">Actions</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {enriched.map((p) => {
              const badge = statusBadge(p.status);

              return (
                <TableRow key={p.id}>
                  <Cell strong>
                    {p.display_title || p.name}
                  </Cell>

                  <Cell>
                    £{Number(p.price).toFixed(2)}
                  </Cell>

                  <Cell>
                    {p.inventory_count ?? 0}
                  </Cell>

                  <Cell>
                    <Badge color={badge.color}>
                      {badge.label}
                    </Badge>
                  </Cell>

                  <Cell>
                    <span className="text-xs text-foreground/60">
                      {p.lastMovement
                        ? `${p.lastMovement.reason} · ${new Date(
                            p.lastMovement.created_at
                          ).toLocaleDateString()}`
                        : "—"}
                    </span>
                  </Cell>

                  <Cell align="right">
                    <Link href={`/admin/products/${p.id}`}>
                      <Button size="sm" variant="neutral">
                        View
                      </Button>
                    </Link>
                  </Cell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {enriched.length === 0 && (
          <p className="p-6 text-neutral-600 text-center">
            No products match your filters.
          </p>
        )}
      </TableSurface>

      {/* PAGINATION */}
      <TablePagination page={page} totalPages={totalPages} />
    </main>
  );
}
