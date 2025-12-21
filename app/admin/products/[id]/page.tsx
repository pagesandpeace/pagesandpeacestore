import { supabaseServer } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await supabaseServer();

  // Fetch product WITH joined metadata — EXCLUDING event products
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      genre:genres(name),
      vibe:vibes(name),
      theme:themes(name)
    `)
    .eq("id", id)
    .neq("product_type", "event") // 🚫 never load event products here
    .single();

  // If not found or is event, show safe fallback
  if (error || !product) {
    console.warn("⚠️ Product not shown (either missing or event type)");
    return (
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-2xl font-bold">Product not accessible</h1>
        <p className="text-neutral-600 mt-2">
          This item cannot be viewed here.
          Event tickets are managed in the Events dashboard.
        </p>

        <Link href="/admin/products" className="inline-block mt-6">
          <Button variant="neutral">Back to Products</Button>
        </Link>
      </div>
    );
  }

  // 📌 Treat blind-date the same as book
  const isBook =
    product.product_type === "book" ||
    product.product_type === "blind-date";

  return (
    <main className="max-w-5xl mx-auto py-10 space-y-10 font-[Montserrat] text-[#111]">
      {/* HERO */}
      <div className="relative w-full h-72 rounded-xl overflow-hidden shadow">
        <Image
          src={product.image_url || "/placeholder-product.jpg"}
          alt={product.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <h1 className="absolute bottom-4 left-6 text-4xl font-bold text-white drop-shadow-lg">
          {product.name}
        </h1>
      </div>

      {/* TOP BAR */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold capitalize">
            {product.product_type}
          </p>
          <p className="text-neutral-600 text-sm">
            Added {new Date(product.created_at).toLocaleString("en-GB")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button variant="primary">Edit Product</Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="neutral">Back</Button>
          </Link>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PRODUCT INFO */}
        <div className="p-6 rounded-lg border bg-white shadow-sm">
          <h3 className="text-xl font-bold mb-3">Product Info</h3>

          <p><strong>Name:</strong> {product.name}</p>
          <p><strong>Type:</strong> {product.product_type}</p>

          {/* 📚 BOOK + BLIND-DATE FIELDS */}
          {isBook && (
            <>
              <p><strong>Author:</strong> {product.author || "—"}</p>
              <p><strong>Genre:</strong> {product.genre?.name || "—"}</p>
              <p><strong>Format:</strong> {product.format || "—"}</p>
              <p><strong>Language:</strong> {product.language || "—"}</p>
              <p><strong>Vibe:</strong> {product.vibe?.name || "—"}</p>
              <p><strong>Theme:</strong> {product.theme?.name || "—"}</p>
            </>
          )}

          <p className="text-sm text-neutral-600 mt-1 break-all">
            <strong>Slug:</strong> {product.slug}
          </p>
        </div>

        {/* INVENTORY */}
        <div className="p-6 rounded-lg border bg-white shadow-sm">
          <h3 className="text-xl font-bold mb-3">Inventory</h3>
          <p><strong>Stock:</strong> {product.inventory_count}</p>

          {product.inventory_count <= 3 ? (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 border border-red-300">
              Low stock
            </span>
          ) : (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 border border-green-300">
              In stock
            </span>
          )}
        </div>

        {/* PRICE */}
        <div className="p-6 rounded-lg border bg-white shadow-sm">
          <h3 className="text-xl font-bold mb-3">Pricing</h3>
          <p className="text-xl font-semibold text-[#2f6b3a]">
            £{Number(product.price).toFixed(2)}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Visible to customers
          </p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="p-6 rounded-lg border bg-white shadow-sm">
        <h3 className="text-xl font-bold mb-3">Description</h3>
        <p className="text-neutral-700 whitespace-pre-line">
          {product.description || "No description provided."}
        </p>
      </div>

      {/* METADATA */}
      <div className="p-6 rounded-lg border bg-white shadow-sm opacity-80">
        <h3 className="text-lg font-semibold mb-2">Metadata</h3>
        <p>
          <strong>Created:</strong>{" "}
          {new Date(product.created_at).toLocaleString("en-GB")}
        </p>
        <p>
          <strong>Updated:</strong>{" "}
          {new Date(product.updated_at).toLocaleString("en-GB")}
        </p>
        <p><strong>ID:</strong> {product.id}</p>
      </div>
    </main>
  );
}
