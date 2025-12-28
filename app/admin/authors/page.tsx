export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminAuthorsPage() {
  const supabase = await supabaseServer();

  const { data: authors, error } = await supabase
    .from("authors")
    .select("id, name, slug, created_at")
    .order("name");

  if (error) {
    console.error("❌ ADMIN AUTHORS ERROR:", error);
    return (
      <p className="p-6 text-red-600">
        Failed to load authors.
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">
          Authors
        </h1>

        <Link
          href="/admin/authors/new"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Add author
        </Link>
      </div>

      {(!authors || authors.length === 0) ? (
        <p className="text-neutral-600">
          No authors found.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3">Name</th>
              <th className="py-3">Slug</th>
              <th className="py-3"></th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr
                key={author.id}
                className="border-b last:border-none"
              >
                <td className="py-3">
                  {author.name}
                </td>
                <td className="py-3 text-sm text-neutral-600">
                  {author.slug}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/authors/${author.id}`}
                    className="text-sm underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
