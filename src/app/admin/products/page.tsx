"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

import ProductSearchBar from "@/components/admin/products/ProductSearchBar";
import ProductTypeFilter from "@/components/admin/products/ProductTypeFilter";
import PaginationControls from "@/components/admin/products/PaginationControls";

/* ---------------------------------------
   TYPES
----------------------------------------- */
type GenericMetadata = Record<string, unknown> | null;

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  genre_name: string | null;
  product_type: string;
  inventory_count: number;
  metadata: GenericMetadata;
};

export default function AdminProductsPage() {
  const PAGE_SIZE = 20;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  /* --------------------------------------
     LOAD PRODUCTS
  ----------------------------------------- */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/products?search=${search}&type=${type}&page=${page}&pageSize=${PAGE_SIZE}`
        );

        const data = await res.json();

        // Accept new or old format
        if (data.items) {
          setProducts(data.items);
          setTotal(data.total);
        } else if (data.products) {
          setProducts(data.products);
          setTotal(data.products.length);
        }
      } catch {
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [search, type, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) {
    return (
      <main className="p-10">
        <Alert type="error" message={error} />
      </main>
    );
  }

  /* --------------------------------------
     UI
  ----------------------------------------- */
  return (
    <main className="p-10 font-[Montserrat] space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>

        <Link href="/admin/products/new">
          <Button variant="primary">+ New Product</Button>
        </Link>
      </div>

      {/* FILTER BAR */}
      <div className="flex gap-4 items-center">
        <ProductSearchBar value={search} onChange={(v) => {
          setSearch(v);
          setPage(1);
        }} />

        <ProductTypeFilter value={type} onChange={(v) => {
          setType(v);
          setPage(1);
        }} />
      </div>

      {/* PRODUCT TABLE */}
<div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
  <table className="w-full text-left text-sm">
    <thead className="text-neutral-600 text-xs uppercase tracking-wide">
      <tr className="border-b">
        <th className="py-3">Image</th>
        <th>Name</th>
        <th>Price</th>
        <th>Genre</th>
        <th>Type</th>
        <th>Stock</th>
        <th className="w-16"></th>
      </tr>
    </thead>

    <tbody className="text-[15px]">
      {products.map((p) => (
        <tr
          key={p.id}
          className="border-b hover:bg-neutral-50 transition-colors"
        >
          {/* IMAGE */}
          <td className="py-3">
            <Image
              src={p.image_url || "/coming_soon.svg"}
              alt={p.name}
              width={56}
              height={56}
              className="rounded-lg object-cover border"
            />
          </td>

          {/* NAME */}
          <td className="font-medium">{p.name}</td>

          {/* PRICE */}
          <td>£{Number(p.price).toFixed(2)}</td>

          {/* GENRE */}
          <td>{p.genre_name ?? "—"}</td>

          {/* TYPE */}
          <td>
            <span className="px-2 py-1 rounded-full text-xs bg-neutral-200">
              {p.product_type}
            </span>
          </td>

          {/* STOCK */}
          <td>
            {p.inventory_count <= 0 ? (
              <Badge color="red">Out</Badge>
            ) : p.inventory_count <= 5 ? (
              <Badge color="yellow">Low</Badge>
            ) : (
              <Badge color="green">{p.inventory_count}</Badge>
            )}
          </td>

          {/* EDIT BUTTON */}
          <td className="text-right">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-accent font-medium hover:underline"
            >
              Edit →
            </Link>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


      {/* PAGINATION */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onChange={(p) => setPage(p)}
      />
    </main>
  );
}
