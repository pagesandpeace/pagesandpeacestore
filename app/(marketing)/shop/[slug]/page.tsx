// app/(marketing)/shop/[slug]/page.tsx
export const dynamic = "force-dynamic";

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

  console.log("🛒 [SHOP PAGE] Loading product for slug:", slug);

  const supabase = await supabaseServer();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
        *,
        genre:genres(id, name),
        vibe:vibes(id, name),
        theme:themes(id, name)
      `
    )
    .eq("slug", slug)
    .neq("product_type", "event")
    .maybeSingle(); // avoids hard error when no row

  console.log(
    "🛒 [SHOP PAGE] Supabase product result:",
    JSON.stringify(
      {
        slug,
        error,
        product,
        genre: product?.genre,
        vibe: product?.vibe,
        theme: product?.theme,
        genre_id: product?.genre_id,
        vibe_id: product?.vibe_id,
        theme_id: product?.theme_id,
      },
      null,
      2
    )
  );

  if (!product || error) {
    console.warn("⚠️ [SHOP PAGE] Product not found or error:", error);
    return (
      <div className="p-20 text-center text-xl">
        Product not found.
      </div>
    );
  }

  return <ProductDetail product={product} />;
}
