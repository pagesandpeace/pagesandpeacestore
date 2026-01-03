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

export async function fetchProducts(params: ProductQueryParams) {
  const supabase = supabaseService();

  const safe = { ...params };

  const page = Number(safe.page ?? 1);
  const type = safe.type ?? "all";
  const search = safe.search?.trim() ?? "";
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
     (supplier author + canonical author relation)
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
     GLOBAL SEARCH
  -------------------------------------------------------- */
  if (search) {
    const { data: matchingAuthors } = await supabase
      .from("authors")
      .select("id")
      .ilike("name", `%${search}%`);

    const authorIds = (matchingAuthors ?? []).map((a) => a.id);

    const clauses = [
      `display_title.ilike.%${search}%`,
      `name.ilike.%${search}%`,
      `description.ilike.%${search}%`,
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
     (canonical > supplier > null)
  -------------------------------------------------------- */
  const products =
    (data ?? []).map((p: any) => ({
      ...p,
      author:
        p.author_rel?.name ??
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
