export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { redirect } from "next/navigation";
import AdminProductFilterBar from "./AdminProductFilterBar";

/* ------------------------------------
   TYPES
------------------------------------ */

type SearchParams = {
  search?: string;
  status?: string;
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
  if (p.fulfilment_mode === "made_to_order") {
    return "made_to_order";
  }

  const qty = p.inventory_count ?? 0;

  if (qty === 0) return "out";
  if (qty <= 3) return "low";
  return "in_stock";
}


function statusRank(status: ProductStatus): number {
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

  const search = params.search?.trim() ?? "";
  const statusFilter = (params.status ?? "all") as ProductStatus | "all";
  const page = Math.max(Number(params.page ?? 1), 1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .neq("product_type", "event")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `display_title.ilike.%${search}%,name.ilike.%${search}%`
    );
  }

  const { data: products, count, error } = await query;

  if (error || !products) {
    console.error("ADMIN PRODUCTS FETCH ERROR:", error);
    return null;
  }

  /* ------------------------------------
     FETCH LAST STOCK MOVEMENTS
  ------------------------------------ */

  const productIds = products.map((p) => p.id);

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("product_id, reason, created_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false });

  const lastMovementByProduct: Record<string, StockMovement> = {};

  movements?.forEach((m: StockMovement) => {
    if (!lastMovementByProduct[m.product_id]) {
      lastMovementByProduct[m.product_id] = m;
    }
  });

  /* ------------------------------------
     ENRICH + FILTER + SORT
  ------------------------------------ */

  const enriched = products
    .map((p: ProductRow) => {
      const status = deriveStatus(p);
      return {
        ...p,
        status,
        lastMovement: lastMovementByProduct[p.id] ?? null,
      };
    })
    .filter(
      (p) => statusFilter === "all" || p.status === statusFilter
    )
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

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

      {/* FILTER BAR */}
      <AdminProductFilterBar />

      {/* TABLE */}
      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f4f0ea] text-xs uppercase text-[#444]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last movement</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {enriched.map((p) => {
              const badge = statusBadge(p.status);

              return (
                <tr key={p.id} className="border-t hover:bg-[#faf8f5]">
                  <td className="px-4 py-3 font-medium">
                    {p.display_title || p.name}
                  </td>

                  <td className="px-4 py-3">
                    £{Number(p.price).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">
                    {p.inventory_count ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    <Link href={`/admin/products?status=${p.status}`}>
                      <Badge
                        color={badge.color}
                        className="cursor-pointer hover:opacity-80"
                      >
                        {badge.label}
                      </Badge>
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {p.lastMovement
                      ? `${p.lastMovement.reason} · ${new Date(
                          p.lastMovement.created_at
                        ).toLocaleDateString()}`
                      : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`}>
                      <Button size="sm" variant="neutral">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {enriched.length === 0 && (
          <p className="p-6 text-neutral-600 text-center">
            No products match your filters.
          </p>
        )}
      </div>
    </main>
  );
}
