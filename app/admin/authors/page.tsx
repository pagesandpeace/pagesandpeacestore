export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { Cell } from "@/components/table/Cell";
import { HeadCell } from "@/components/table/HeadCell";

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
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
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

      {/* TABLE */}
      <TableSurface>
        <Table>
          <TableHead>
            <tr>
              <HeadCell>Name</HeadCell>
              <HeadCell>Slug</HeadCell>
              <HeadCell>{" "}</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {(!authors || authors.length === 0) ? (
              <TableRow>
                <Cell>
                  <span className="text-neutral-600">
                    No authors found.
                  </span>
                </Cell>
                <Cell>{" "}</Cell>
                <Cell>{" "}</Cell>
              </TableRow>
            ) : (
              authors.map((author) => (
                <TableRow key={author.id}>
                  <Cell strong>
                    {author.name}
                  </Cell>

                  <Cell>
                    <span className="text-sm text-foreground/60">
                      {author.slug}
                    </span>
                  </Cell>

                  <Cell>
                    <Link
                      href={`/admin/authors/${author.id}`}
                      className="text-sm underline"
                    >
                      Edit
                    </Link>
                  </Cell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableSurface>
    </div>
  );
}
