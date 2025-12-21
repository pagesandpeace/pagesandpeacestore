// lib/shop/fetchProducts.ts
import { supabaseServer } from "@/lib/supabase/server";

export const PAGE_SIZE = 12;

export type ProductQueryParams = {
  page?: string;
  type?: string;
  search?: string;
  genre?: string;
  author?: string;
  vibe?: string;
  theme?: string;
  inStock?: string;
  sort?: string;
};

export async function fetchProducts(params: ProductQueryParams) {
  const supabase = await supabaseServer();

  const safe = { ...params };

  const page = Number(safe.page ?? 1);
  const type = safe.type ?? "all";
  const search = safe.search ?? "";
  const sort = safe.sort ?? "newest";
  const inStock = safe.inStock === "1";

  const genre = safe.genre ?? "";
  const author = safe.author ?? "";
  const vibeParam = safe.vibe?.toLowerCase() ?? "";
  const themeParam = safe.theme?.toLowerCase() ?? "";

  // ❌ REMOVED "event"
  const TYPES = ["blind-date", "book", "coffee", "merch", "physical"];

  /* --------------------------------------------------------
     RESOLVE VIBE
  -------------------------------------------------------- */
  let vibeId = "";
  if (vibeParam) {
    if (vibeParam.length === 36) {
      vibeId = vibeParam;
    } else {
      const { data: vibeRow } = await supabase
        .from("vibes")
        .select("id, name")
        .ilike("name", vibeParam)
        .single();

      if (vibeRow) vibeId = vibeRow.id;
    }
  }

  /* --------------------------------------------------------
     RESOLVE THEME
  -------------------------------------------------------- */
  let themeId = "";
  if (themeParam) {
    if (themeParam.length === 36) {
      themeId = themeParam;
    } else {
      const { data: themeRow } = await supabase
        .from("themes")
        .select("id, name")
        .ilike("name", themeParam)
        .single();

      if (themeRow) themeId = themeRow.id;
    }
  }

  /* --------------------------------------------------------
     BASE QUERY
  -------------------------------------------------------- */
  let query = supabase
    .from("products")
    .select(
      `
        *,
        vibe:vibe_id(id, name),
        theme:theme_id(id, name)
      `,
      { count: "exact" }
    )
    // 🔒 HARD GUARANTEE: events NEVER appear in shop
    .neq("product_type", "event");

  // Filter by type
  if (type !== "all") {
    query = query.eq("product_type", type);
  } else {
    query = query.in("product_type", TYPES);
  }

  // Search
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // In-stock only
  if (inStock) {
    query = query.gt("inventory_count", 0);
  }

  // BOOK FILTERS
  if (type === "book") {
    if (genre) query = query.eq("genre_id", genre);
    if (author) query = query.ilike("author", `%${author}%`);
  }

  // BLIND-DATE FILTERS
  if (type === "blind-date") {
    if (genre) query = query.eq("genre_id", genre);
    if (vibeId) query = query.eq("vibe_id", vibeId);
    if (themeId) query = query.eq("theme_id", themeId);
  }

  // Sorting
  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "az":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }

  return {
    products: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}
