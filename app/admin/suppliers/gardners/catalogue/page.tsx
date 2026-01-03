export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import GardnersCatalogueClient from "./GardnersCatalogueClient";

const PAGE_SIZE = 50;

export default async function GardnersCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams; // ✅ unwrap promise

  const supabase = await supabaseServer();

  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() ?? "";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("supplier_products")
    .select(
      `
        id,
        supplier,
        supplier_ref,
        import_batch_id,
        title,
        display_title,
        author,
        binding,
        supplier_price,
        rank_pos,
        product_supplier_links (
          id,
          product_id
        )
      `,
      { count: "exact" }
    )
    .eq("supplier", "gardners");

  // 🔍 SEARCH
  if (search) {
    query = query.or(
      [
        `display_title.ilike.%${search}%`,
        `title.ilike.%${search}%`,
        `author.ilike.%${search}%`,
        `supplier_ref.ilike.%${search}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query
    .order("rank_pos", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (error) {
    console.error("❌ Supplier catalogue fetch failed:", error);
    throw new Error("Failed to load supplier catalogue");
  }

  return (
    <GardnersCatalogueClient
      rows={data ?? []}
      page={page}
      pageSize={PAGE_SIZE}
      total={count ?? 0}
      search={search}
    />
  );
}
