export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import ProductDetail from "@/components/shop/product/ProductDetail";

type PageParams = {
  slug: string;
};

export default async function ProductPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  /* ------------------------------------------
     FETCH PRODUCT (WITH AUTHOR)
  ------------------------------------------ */
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      author:authors(
        id,
        name,
        slug,
        short_bio,
        profile_image_url
      ),
      genre:genres(id, name),
      vibe:vibes(id, name),
      theme:themes(id, name)
    `)
    .eq("slug", slug)
    .neq("product_type", "event")
    .maybeSingle();

  if (!product || error) {
    return (
      <div className="p-20 text-center text-xl">
        Product not found.
      </div>
    );
  }

  /* ------------------------------------------
     FETCH MORE BY SAME AUTHOR
  ------------------------------------------ */
  let moreByAuthor: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    price: number | string;
  }[] = [];

  if (product.author?.id) {
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, image_url, price")
      .eq("author_id", product.author.id)
      .eq("product_type", "book")
      .neq("id", product.id)
      .limit(4);

    moreByAuthor = data ?? [];
  }

  return (
    <div className="space-y-16">
      {/* MAIN PRODUCT */}
      <ProductDetail product={product} />

      {/* MORE FROM THIS AUTHOR */}
      {moreByAuthor.length > 0 && product.author && (
        <div className="max-w-6xl mx-auto px-6 pb-20">
          {/* AUTHOR HEADER */}
          <div className="flex items-center gap-4 mb-8">
            {product.author.profile_image_url ? (
              <Image
                src={product.author.profile_image_url}
                alt={product.author.name}
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200" />
            )}

            <div>
              <h2 className="text-xl font-serif">
                More from{" "}
                <Link
                  href={`/authors/${product.author.slug}`}
                  className="underline hover:text-foreground"
                >
                  {product.author.name}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">
                Explore other books by this author
              </p>
            </div>
          </div>

          {/* BOOK GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {moreByAuthor.map((p) => (
              <Link
                key={p.id}
                href={`/shop/${p.slug}`}
                className="group"
              >
                <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={300}
                      height={400}
                      className="w-full h-56 object-cover"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-100" />
                  )}

                  <div className="p-3">
                    <h3 className="text-sm font-medium group-hover:underline">
                      {p.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      £{Number(p.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
