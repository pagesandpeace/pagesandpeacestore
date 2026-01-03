import { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * Fetch ALL rows from the products table.
 * Intended ONLY for admin / reconciliation logic.
 */
export async function fetchAllProducts<T>(
  supabase: SupabaseClient,
  columns: string
): Promise<T[]> {
  let from = 0;
  const all: T[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as T[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return all;
}
