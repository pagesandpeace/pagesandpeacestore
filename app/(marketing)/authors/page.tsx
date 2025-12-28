export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";

/* ----------------------------------------
   SEO METADATA
---------------------------------------- */
export const metadata = {
  title: "Authors | Pages & Peace",
  description:
    "Explore authors featured at Pages & Peace and discover their books.",
};

export default async function AuthorsPage() {
  const supabase = await supabaseServer();

  const { data: authors, error } = await supabase
    .from("authors")
    .select("id, name, slug, short_bio, profile_image_url")
    .order("name");

  /* -----------------------------
     🔴 HARD DEBUG (SAFE FOR NOW)
  ----------------------------- */
  if (error) {
    console.error("❌ AUTHORS QUERY ERROR:", error);

    return (
      <pre className="p-6 text-sm text-red-600 whitespace-pre-wrap">
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  if (!authors || authors.length === 0) {
    return (
      <p className="p-6 text-neutral-600">
        No authors found.
      </p>
    );
  }

  /* -----------------------------
     RENDER
  ----------------------------- */
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif mb-8">
        Authors
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {authors.map((author) => (
          <Link
            key={author.id}
            href={`/authors/${author.slug}`}
            className="group"
          >
            <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition">
              {author.profile_image_url ? (
                <Image
                  src={author.profile_image_url}
                  alt={author.name}
                  width={400}
                  height={400}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}

              <div className="p-4">
                <h2 className="text-lg font-medium group-hover:underline">
                  {author.name}
                </h2>

                {author.short_bio && (
                  <p className="text-sm text-gray-600 mt-2">
                    {author.short_bio}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
