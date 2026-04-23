import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

import { getOrders } from "@/lib/admin/orders/getOrders";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { Cell } from "@/components/table/Cell";
import { HeadCell } from "@/components/table/HeadCell";

import { TableSearch } from "@/components/table/TableSearch";
import { TablePagination } from "@/components/table/TablePagination";

export const revalidate = 0;

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortId(id: string, n = 8) {
  return id?.slice(0, n) ?? "";
}

function asMoney(total: string | number) {
  const num = typeof total === "string" ? Number(total) : total;
  return Number.isNaN(num) ? String(total) : num.toFixed(2);
}

function getOrderTitle(
  orderItems?: { name: string | null; kind: string | null }[] | null
) {
  if (!orderItems || orderItems.length === 0) {
    return { title: "—", meta: "" };
  }

  const firstNamed = orderItems.find((item) => item.name?.trim());
  const first = firstNamed ?? orderItems[0];

  const title = first?.name?.trim() || "Untitled item";
  const extraCount = orderItems.length - 1;
  const kind = first?.kind
    ? first.kind[0].toUpperCase() + first.kind.slice(1)
    : "";

  let meta = kind;

  if (extraCount > 0) {
    meta = meta ? `${meta} • +${extraCount} more` : `+${extraCount} more`;
  }

  return { title, meta };
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?callbackURL=/admin/orders");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* ---------------- PARAMS ---------------- */

  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const page = Math.max(Number(params.page ?? 1), 1);

  /* ---------------- DATA ---------------- */

  const { rows: orders, usersById, totalPages } = await getOrders({
    q,
    page,
    pageSize: 20,
  });

  /* ---------------- RENDER ---------------- */

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Orders</h1>

      <TableSearch
        placeholder="Search order ID, customer, email, item title"
        debounceMs={300}
      />

      <TableSurface>
        <Table>
          <TableHead>
            <tr>
              <HeadCell>Date</HeadCell>
              <HeadCell>Order</HeadCell>
              <HeadCell>Item</HeadCell>
              <HeadCell>Customer</HeadCell>
              <HeadCell>Status</HeadCell>
              <HeadCell>Total</HeadCell>
              <HeadCell>{" "}</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {orders.map((o) => {
              const customer = o.user_id ? usersById.get(o.user_id) : null;
              const itemInfo = getOrderTitle(o.order_items);

              return (
                <TableRow key={o.id}>
                  <Cell>{fmtDate(o.created_at)}</Cell>

                  <Cell>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {shortId(o.id, 10)}
                    </Link>

                    <div className="text-xs text-foreground/60 mt-1">
                      Stripe:{" "}
                      {o.stripe_checkout_session_id
                        ? shortId(o.stripe_checkout_session_id, 14)
                        : "—"}
                    </div>
                  </Cell>

                  <Cell>
                    <div>{itemInfo.title}</div>
                    {itemInfo.meta ? (
                      <div className="text-xs text-foreground/60">
                        {itemInfo.meta}
                      </div>
                    ) : null}
                  </Cell>

                  <Cell>
                    <div>{customer?.name ?? "—"}</div>
                    <div className="text-xs text-foreground/60">
                      {customer?.email ?? "—"}
                    </div>
                  </Cell>

                  <Cell>{o.status ?? "—"}</Cell>

                  <Cell strong>£{asMoney(o.total)}</Cell>

                  <Cell>{" "}</Cell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableSurface>

      <TablePagination page={page} totalPages={totalPages} />
    </div>
  );
}