export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

// Shared product components
import AddToCartButton from "@/components/product/AddToCartButton";
import BuyNowButton from "@/components/product/BuyNowButton";
import StockStatus from "@/components/product/StockStatus";
import FulfilmentInfo from "@/components/product/FulfilmentInfo";
import PriceDisplay from "@/components/product/PriceDisplay";
import ProductBadge from "@/components/product/ProductBadge";

function getColour(name: string) {
  const map: Record<string, string> = {
    "Brown Kraft": "#c2a679",
    Cream: "#f2e6d8",
    White: "#ffffff",
    Pink: "#f4c2c2",
    Red: "#d40000",
    Navy: "#1a2a6c",
    "Forest Green": "#0b3d2e",
    "Pastel Blue": "#a7c7e7",
    "Pastel Yellow": "#fff5a2",
    Burgundy: "#800020",
    Black: "#000000",
  };
  return map[name] || "#dcdcdc";
}

export default async function BlindDateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch product
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));

  if (!product) {
    return (
      <main className="py-20 text-center">
        <h1 className="text-3xl font-semibold mb-4">
          Blind-Date Book Not Found
        </h1>
        <Link href="/blind-date">
          <button className="px-6 py-3 border rounded-full mt-4">
            Back to Blind Dates
          </button>
        </Link>
      </main>
    );
  }

  const meta = (product.metadata ?? {}) as {
    theme?: string;
    colour?: string;
    vibe?: string;
    items?: string[];
  };

  const image = product.image_url || "/coming_soon.svg";
  const price = Number(product.price) || 0;

  return (
    <main className="bg-background min-h-screen py-10 px-4 font-[Montserrat]">
      
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto mb-6 text-sm">
        <Link href="/" className="text-accent hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/blind-date" className="text-accent hover:underline">
          Blind-Date Books
        </Link>{" "}
        / <span className="text-neutral-500">{product.name}</span>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* IMAGE */}
        <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow">
          <Image src={image} alt={product.name} fill className="object-cover" />
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">

          {/* ProductBadge expects { genre }, not productType */}
          <ProductBadge genre={product.genre_id ?? null} />

          <h1 className="text-4xl font-bold text-foreground">
            {product.name}
          </h1>

          <PriceDisplay price={price} />

          {/* StockStatus expects ONLY { count } */}
          <StockStatus count={product.inventory_count} />

          {/* BLIND-DATE METADATA BLOCK */}
          <div className="bg-white shadow rounded-xl p-6 space-y-4">
            {meta.theme && (
              <p>
                <strong>Theme:</strong> {meta.theme}
              </p>
            )}

            {meta.vibe && (
              <p>
                <strong>Vibe:</strong> {meta.vibe}
              </p>
            )}

            {meta.colour && (
              <div className="flex items-center gap-4">
                <strong>Colour:</strong>
                <span
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: getColour(meta.colour) }}
                />
                <span>{meta.colour}</span>
              </div>
            )}

            {meta.items && meta.items.length > 0 && (
              <div>
                <strong>Included items:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  {meta.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          {product.description && (
            <div className="bg-[var(--card)] p-6 rounded-xl shadow space-y-4">
              <h2 className="text-xl font-semibold">A cosy surprise…</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* CTA BUTTONS */}
          <div className="space-y-4 pt-6">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price,
                imageUrl: image,
              }}
            />

            <BuyNowButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price,
                imageUrl: image,
              }}
            />
          </div>

          <FulfilmentInfo />
        </div>
      </div>
    </main>
  );
}
