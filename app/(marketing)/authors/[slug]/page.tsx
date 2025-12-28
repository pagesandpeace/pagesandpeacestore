import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageParams = {
  slug: string;
};

/* ----------------------------------------
   SEO METADATA
---------------------------------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: author } = await supabase
    .from("authors")
    .select("name, bio")
    .eq("slug", slug)
    .maybeSingle();

  if (!author) {
    return {
      title: "Author not found | Pages & Peace",
    };
  }

  return {
    title: `${author.name} | Books | Pages & Peace`,
    description:
      author.bio ??
      `Discover books by ${author.name} at Pages & Peace.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  /* -----------------------------
     FETCH AUTHOR
  ----------------------------- */
  const { data: author } = await supabase
    .from("authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!author) {
    notFound();
  }

  /* -----------------------------
     FETCH AUTHOR BOOKS
  ----------------------------- */
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, image_url, price")
    .eq("author_id", author.id)
    .eq("product_type", "book")
    .eq("is_test", false)
    .order("created_at", { ascending: false });

  /* -----------------------------
     RENDER
  ----------------------------- */
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* AUTHOR HEADER */}
      <div className="flex flex-col sm:flex-row gap-8 mb-16">
        {author.profile_image_url ? (
          <Image
            src={author.profile_image_url}
            alt={author.name}
            width={160}
            height={160}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gray-200" />
        )}

        <div>
          <h1 className="text-3xl font-serif mb-4">
            {author.name}
          </h1>

          {author.bio && (
            <p className="text-muted-foreground max-w-2xl">
              {author.bio}
            </p>
          )}

          <div className="mt-4">
            <Link
              href={`/shop?type=book&author=${author.id}`}
              className="text-sm underline text-muted-foreground hover:text-black"
            >
              View all books by {author.name}
            </Link>
          </div>
        </div>
      </div>

      {/* BOOKS */}
      <h2 className="text-2xl font-serif mb-6">
        Books by {author.name}
      </h2>

      {!products || products.length === 0 ? (
        <p className="text-muted-foreground">
          No books available.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
          {products.map((p) => (
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

                <div className="p-4">
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
      )}
    </div>
  );
}
