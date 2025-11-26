export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import AddToCartButton from "@/components/product/AddToCartButton";
import BuyNowButton from "@/components/product/BuyNowButton";
import StockStatus from "@/components/product/StockStatus";
import FulfilmentInfo from "@/components/product/FulfilmentInfo";
import PriceDisplay from "@/components/product/PriceDisplay";
import ProductBadge from "@/components/product/ProductBadge";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));

  if (!product) {
    return (
      <main className="py-20 text-center">
        <h1 className="text-3xl font-semibold mb-4">Product Not Found</h1>
        <Link href="/shop">
          <button className="px-6 py-3 border rounded-full mt-4">
            Back to Shop
          </button>
        </Link>
      </main>
    );
  }

  const image = product.image_url || "/coming_soon.svg";
  const price = Number(product.price) || 0;

  return (
    <main className="bg-background min-h-screen py-10 px-4 font-[Montserrat]">
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto mb-6 text-sm">
        <Link href="/shop" className="text-accent hover:underline">
          Shop
        </Link>{" "}
        / <span className="text-neutral-500">{product.name}</span>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* IMAGE */}
        <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow">
          <Image src={image} alt={product.name} fill className="object-cover" />
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* ProductBadge expects { genre }, not { productType } */}
          <ProductBadge genre={product.genre_id ?? null} />

          <h1 className="text-4xl font-bold text-foreground">
            {product.name}
          </h1>

          {product.author && (
            <p className="text-lg text-foreground/70">
              by {product.author}
            </p>
          )}

          <PriceDisplay price={price} />

          {/* StockStatus expects only { count } */}
          <StockStatus count={product.inventory_count} />

          {product.description && (
            <p className="leading-relaxed text-foreground/80 whitespace-pre-line">
              {product.description}
            </p>
          )}

          {/* CTA BUTTONS */}
          <div className="pt-4 space-y-4">
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
