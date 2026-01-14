import { createClient } from "@supabase/supabase-js";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

export type OrderRow = {
  id: string;
  created_at: string;
  total: string | number;
  status: string | null;
  stripe_checkout_session_id: string | null;
  user_id: string | null;
};

export type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

type GetOrdersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

/* ---------------------------------------------
   CLIENT
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   MAIN QUERY
--------------------------------------------- */

export async function getOrders({
  q = "",
  page = 1,
  pageSize = 20,
}: GetOrdersParams) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  /* ---------------- ORDERS ---------------- */

  let ordersQuery = supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      created_at,
      total,
      status,
      stripe_checkout_session_id,
      user_id
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  /* ---------------- SEARCH ---------------- */

if (q && q.trim().length >= 3) {
  const needle = q.trim().toLowerCase();
  ordersQuery = ordersQuery.ilike("search_text", `%${needle}%`);
}


  /* ---------------- PAGINATION ---------------- */

  const { data: orders, count, error } = await ordersQuery.range(from, to);

  if (error) {
    console.error("❌ getOrders failed", error);
    throw error;
  }

  const orderRows = (orders ?? []) as OrderRow[];

  /* ---------------- USERS (SECOND QUERY) ---------------- */

  const userIds = Array.from(
    new Set(orderRows.map((o) => o.user_id).filter(Boolean) as string[])
  );

  const usersById = new Map<string, UserRow>();

  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    for (const u of users ?? []) {
      usersById.set(u.id, u);
    }
  }

  const totalPages = Math.max(
    Math.ceil((count ?? 0) / pageSize),
    1
  );

  return {
    rows: orderRows,
    usersById,
    totalPages,
    page,
  };
}
