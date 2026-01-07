import { supabaseService } from "@/lib/supabase/service";

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

type ProductRow = {
  id: string;
  name: string;
  display_title: string | null;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  inventory_count: number | null;
  fulfilment_mode: string | null;
  product_type: string;
  format: string | null;
  language: string | null;
  author_id: string | null;
  author: string | null;
  genre_id: string | null;
  vibe_id: string | null;
  theme_id: string | null;
  author_rel?: {
    id: string;
    name: string | null;
  }[] | null;
};

/* --------------------------------------------------------
   SEARCH NORMALISATION (POSTGREST-SAFE)
-------------------------------------------------------- */
function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* --------------------------------------------------------
   POSTGREST ESCAPE (NOT USED FOR .or SEARCH)
-------------------------------------------------------- */
function escapePostgrestLike(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export async function fetchProducts(params: ProductQueryParams) {
  const supabase = supabaseService();

  const safe = { ...params };

  const page = Number(safe.page ?? 1);
  const type = safe.type ?? "all";
  const rawSearch = safe.search?.trim() ?? "";
  const sort = safe.sort ?? "newest";
  const inStock = safe.inStock === "1";

  const genre = safe.genre ?? "";
  const authorId = safe.author ?? "";
  const vibeParam = safe.vibe?.toLowerCase() ?? "";
  const themeParam = safe.theme?.toLowerCase() ?? "";

  const TYPES = ["blind-date", "book", "coffee", "merch", "physical"];

  /* --------------------------------------------------------
     RESOLVE VIBE
  -------------------------------------------------------- */
  let vibeId = "";
  if (vibeParam) {
    if (vibeParam.length === 36) {
      vibeId = vibeParam;
    } else {
      const { data } = await supabase
        .from("vibes")
        .select("id")
        .ilike("name", vibeParam)
        .maybeSingle();
      if (data) vibeId = data.id;
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
      const { data } = await supabase
        .from("themes")
        .select("id")
        .ilike("name", themeParam)
        .maybeSingle();
      if (data) themeId = data.id;
    }
  }

  /* --------------------------------------------------------
     BASE QUERY
  -------------------------------------------------------- */
  let query = supabase
    .from("products")
    .select(
      `
        id,
        name,
        display_title,
        slug,
        description,
        price,
        image_url,
        inventory_count,
        fulfilment_mode,
        product_type,
        format,
        language,
        author_id,
        author,
        genre_id,
        vibe_id,
        theme_id,
        author_rel:authors(id, name),
        vibe:vibe_id(id, name),
        theme:theme_id(id, name)
      `,
      { count: "exact" }
    )
    .neq("product_type", "event")
    .eq("is_test", false);

  /* --------------------------------------------------------
     TYPE FILTER
  -------------------------------------------------------- */
  if (type !== "all") {
    query = query.eq("product_type", type);
  } else {
    query = query.in("product_type", TYPES);
  }

  /* --------------------------------------------------------
     GLOBAL SEARCH (FIXED)
  -------------------------------------------------------- */
  if (rawSearch) {
    const safeSearch = normalizeSearch(rawSearch);

    const { data: matchingAuthors } = await supabase
      .from("authors")
      .select("id")
      .ilike("name", `%${safeSearch}%`);

    const authorIds = (matchingAuthors ?? []).map((a) => a.id);

    const clauses = [
      `display_title.ilike.%${safeSearch}%`,
      `name.ilike.%${safeSearch}%`,
      `description.ilike.%${safeSearch}%`,
    ];

    if (authorIds.length > 0) {
      clauses.push(`author_id.in.(${authorIds.join(",")})`);
    }

    query = query.or(clauses.join(","));
  }

  /* --------------------------------------------------------
     IN STOCK FILTER
  -------------------------------------------------------- */
  if (inStock) {
    query = query.or(
      "inventory_count.gt.0,fulfilment_mode.eq.made_to_order"
    );
  }

  /* --------------------------------------------------------
     BOOK FILTERS
  -------------------------------------------------------- */
  if (type === "book") {
    if (genre) query = query.eq("genre_id", genre);
    if (authorId) query = query.eq("author_id", authorId);
  }

  /* --------------------------------------------------------
     BLIND DATE FILTERS
  -------------------------------------------------------- */
  if (type === "blind-date") {
    if (genre) query = query.eq("genre_id", genre);
    if (vibeId) query = query.eq("vibe_id", vibeId);
    if (themeId) query = query.eq("theme_id", themeId);
  }

  /* --------------------------------------------------------
     SORTING
  -------------------------------------------------------- */
  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "az":
      query = query
        .order("display_title", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  /* --------------------------------------------------------
     PAGINATION
  -------------------------------------------------------- */
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }

  /* --------------------------------------------------------
     NORMALISE AUTHOR FOR SHOP UI
  -------------------------------------------------------- */
  const products =
    (data ?? []).map((p: ProductRow) => ({
      ...p,
      author:
        p.author_rel?.[0]?.name ??
        p.author ??
        null,
    }));

  return {
    products,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}
