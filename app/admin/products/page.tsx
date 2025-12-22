export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Products | Pages & Peace",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  merch: "Merch",
  book: "Book",
  other: "Other",
};

type RawSearchParams = {
  search?: string;
  page?: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const supabase = await supabaseServer();

  // ✅ MUST AWAIT IN NEXT 15
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
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
    query = query.ilike("name", `%${search}%`);
  }

  const { data: products, count, error } = await query;

  if (error) {
    console.error("PRODUCT FETCH ERROR:", error);
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  if (page > totalPages && totalPages > 0) {
    redirect(`/admin/products?page=${totalPages}`);
  }

  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-wide">Products</h1>
          <p className="text-neutral-600 text-sm">
            Manage shop products and track inventory.
          </p>
        </div>

        <div className="flex gap-3">
          <form action="/admin/products" method="get">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search products…"
              className="border rounded-md px-3 py-2 text-sm w-64"
            />
          </form>

          <Link href="/admin/products/new">
            <Button variant="primary">+ Add Product</Button>
          </Link>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f4f0ea] text-left text-xs uppercase tracking-wide text-[#444]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3 w-28">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products?.map((p) => {
              const low = p.inventory_count <= 3;
              const out = p.inventory_count <= 0;

              return (
                <tr
                  key={p.id}
                  className="border-t hover:bg-[#faf8f5] transition"
                >
                  {/* PRODUCT */}
                  <td className="px-4 py-3 flex items-center gap-3">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-10 h-10 rounded object-cover border"
                      />
                    )}
                    <span className="font-medium">{p.name}</span>
                  </td>

                  {/* TYPE */}
                  <td className="px-4 py-3">
                    {PRODUCT_TYPE_LABELS[p.product_type] ?? p.product_type}
                  </td>

                  {/* PRICE */}
                  <td className="px-4 py-3">
                    £{Number(p.price).toFixed(2)}
                  </td>

                  {/* INVENTORY + STATUS */}
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {out ? "0" : p.inventory_count}
                    </span>

                    {out ? (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-red-200 text-red-800 border border-red-300">
                        Out
                      </span>
                    ) : low ? (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-200 text-yellow-800 border border-yellow-300">
                        Low
                      </span>
                    ) : (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-green-200 text-green-800 border border-green-300">
                        In Stock
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`}>
                      <Button variant="neutral" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products?.length === 0 && (
          <p className="p-6 text-neutral-600 text-center">
            No products found.
          </p>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <Link
            href={`/admin/products?search=${encodeURIComponent(search)}&page=${page - 1}`}
            aria-disabled={page <= 1}
          >
            <Button variant="neutral" disabled={page <= 1}>
              Previous
            </Button>
          </Link>

          <span className="text-sm text-neutral-600">
            Page {page} of {totalPages}
          </span>

          <Link
            href={`/admin/products?search=${encodeURIComponent(search)}&page=${page + 1}`}
            aria-disabled={page >= totalPages}
          >
            <Button variant="neutral" disabled={page >= totalPages}>
              Next
            </Button>
          </Link>
        </div>
      )}
    </main>
  );
}
