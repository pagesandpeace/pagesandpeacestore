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

  // 🔍 SERVER-SIDE DEBUG LOG (REFINED)
  console.log("SHOP PRODUCT DEBUG", {
    id: product.id,
    slug: product.slug,
    inventory_count: product.inventory_count,
    fulfilment_mode: product.fulfilment_mode,
    commercial_model: product.commercial_model,
  });

  const displayProduct = {
    ...product,
    name: product.display_title ?? product.name,
  };

  let moreByAuthor: {
    id: string;
    name: string;
    display_title: string | null;
    slug: string;
    image_url: string | null;
    price: number | string;
  }[] = [];

  if (product.author?.id) {
    const { data } = await supabase
      .from("products")
      .select("id, name, display_title, slug, image_url, price")
      .eq("author_id", product.author.id)
      .eq("product_type", "book")
      .neq("id", product.id)
      .limit(4);

    moreByAuthor = data ?? [];
  }

  return (
    <div className="space-y-16">
      <ProductDetail product={displayProduct} />

      {moreByAuthor.length > 0 && product.author && (
        <div className="max-w-6xl mx-auto px-6 pb-20">
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
                  className="underline"
                >
                  {product.author.name}
                </Link>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {moreByAuthor.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`}>
                <div className="border rounded-lg bg-white">
                  <div className="p-3">
                    <h3 className="text-sm font-medium">
                      {p.display_title ?? p.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
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
