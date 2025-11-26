"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* ---------------------------------------
   PRODUCT TYPE DEFINITIONS
----------------------------------------- */

type BookMetadata = {
  isbn?: string | null;
  author?: string | null;
};

type CoffeeMetadata = {
  roast?: string | null;
  weight?: string | null;
};

type BlindDateMetadata = {
  theme?: string | null;
  colour?: string | null;
  vibe?: string | null;
};

type MerchMetadata = {
  size?: string | null;
  material?: string | null;
  colour?: string | null;
};

type GenericMetadata =
  | BookMetadata
  | CoffeeMetadata
  | BlindDateMetadata
  | MerchMetadata
  | Record<string, unknown>
  | null;

/* ---------------------------------------
   PRODUCT RECORD
----------------------------------------- */

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  genre_name: string | null;
  product_type: "book" | "coffee" | "blind-date" | "merch" | "physical";
  inventory_count: number;
  metadata: GenericMetadata;
};

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------
     LOAD PRODUCTS
  ----------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/products");
        if (!res.ok) throw new Error("Failed to load products");

        const data = await res.json();
        setProducts(data.products);
      } catch {
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="p-10">
        <p>Loading products…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-10">
        <Alert type="error" message={error} />
      </main>
    );
  }

  /* --------------------------------------
     METADATA RENDERING (NO ANY)
  ----------------------------------------- */
  function renderMetadata(p: Product): string {
    const meta = p.metadata;

    if (!meta || typeof meta !== "object") return "—";

    switch (p.product_type) {
      case "book": {
        const m = meta as BookMetadata;
        return [
          m.isbn && `ISBN ${m.isbn}`,
          m.author && `Author: ${m.author}`,
        ]
          .filter(Boolean)
          .join(" • ");
      }

      case "coffee": {
        const m = meta as CoffeeMetadata;
        return [
          m.roast && `Roast: ${m.roast}`,
          m.weight && `Weight: ${m.weight}`,
        ]
          .filter(Boolean)
          .join(" • ");
      }

      case "blind-date": {
        const m = meta as BlindDateMetadata;
        return [
          m.theme && `Theme: ${m.theme}`,
          m.colour && `Colour: ${m.colour}`,
          m.vibe && `Vibe: ${m.vibe}`,
        ]
          .filter(Boolean)
          .join(" • ");
      }

      case "merch": {
        const m = meta as MerchMetadata;
        return [
          m.size && `Size: ${m.size}`,
          m.material && `Material: ${m.material}`,
          m.colour && `Colour: ${m.colour}`,
        ]
          .filter(Boolean)
          .join(" • ");
      }

      default:
        return JSON.stringify(meta);
    }
  }

  /* --------------------------------------
     PAGE UI
  ----------------------------------------- */
  return (
    <main className="p-10 font-[Montserrat]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>

        <Link href="/admin/products/new">
          <Button variant="primary">+ New Product</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3">Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Genre</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Metadata</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-3">
                  {p.image_url && (
                    <Image
                      src={p.image_url}
                      alt={`${p.name} image`}
                      width={56}
                      height={56}
                      className="rounded object-cover"
                    />
                  )}
                </td>

                <td>{p.name}</td>
                <td>£{Number(p.price).toFixed(2)}</td>
                <td>{p.genre_name ?? "—"}</td>
                <td>{p.product_type}</td>
                <td>{p.inventory_count}</td>

                <td className="text-sm text-neutral-700">
                  {renderMetadata(p)}
                </td>

                <td className="text-right">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-accent font-medium"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
