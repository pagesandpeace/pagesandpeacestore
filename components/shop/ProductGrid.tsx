import Link from "next/link";
import Image from "next/image";

type Author =
  | string
  | {
      id: string;
      name: string;
    };

type Product = {
  id: string;
  name: string;
  display_title?: string | null;
  slug: string;
  image_url: string | null;
  price: number | string;
  author?: Author | null;

  // ⭐ bestseller-only field (Option B)
  bestseller_rank?: number;
};

export default function ProductGrid({
  products,
}: {
  products: Product[];
}) {
  if (!products.length) {
    return <p className="text-center py-10">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
      {products.map((product) => {
        const authorName =
          typeof product.author === "string"
            ? product.author
            : product.author?.name;

        const isBestseller =
          typeof product.bestseller_rank === "number" &&
          product.bestseller_rank <= 50;

        return (
          <Link key={product.id} href={`/shop/${product.slug}`}>
            <div className="relative border rounded-lg overflow-hidden bg-white hover:shadow-md transition">
              {/* 🏆 Bestseller badge + rank */}
              {isBestseller && (
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  <div className="bg-black text-white text-sm font-bold px-2 py-1 rounded">
                    #{product.bestseller_rank}
                  </div>
                  <div className="bg-amber-500 text-black text-[10px] font-semibold px-2 py-0.5 rounded">
                    Bestseller
                  </div>
                </div>
              )}

              {/* IMAGE */}
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.display_title ?? product.name}
                  width={300}
                  height={400}
                  className="w-full h-56 object-cover"
                />
              ) : (
                <div className="w-full h-56 bg-gray-100" />
              )}

              {/* CONTENT */}
              <div className="p-3 space-y-1">
                <h3 className="text-sm font-medium leading-snug">
                  {product.display_title ?? product.name}
                </h3>

                {authorName && (
                  <p className="text-xs text-neutral-600">
                    {authorName}
                  </p>
                )}

                <p className="text-sm text-muted-foreground pt-1">
                  £{Number(product.price).toFixed(2)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
