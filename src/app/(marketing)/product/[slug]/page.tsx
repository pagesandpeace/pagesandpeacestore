// ============================================================================
// PRODUCT DETAIL PAGE (SERVER COMPONENT)
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import ClientProductActions from "./ClientProductActions"; // ← NEW clean import

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

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

      {/* GRID */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* IMAGE */}
        <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow">
          <Image src={image} alt={product.name} fill className="object-cover" />
        </div>

        {/* CLIENT ACTIONS */}
        <ClientProductActions product={product} image={image} price={price} />
      </div>
    </main>
  );
}
