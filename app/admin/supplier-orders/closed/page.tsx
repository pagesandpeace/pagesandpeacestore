import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveBackorderTitle } from "@/lib/backorders/resolveBackorderTitle";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { HeadCell } from "@/components/table/HeadCell";
import { Cell } from "@/components/table/Cell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ---------------------------------------------
   ADMIN CLIENT
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function SupplierOrdersClosedPage() {
  const supabase = await supabaseServer();

  /* ---------- AUTH ---------- */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?callbackURL=/admin/supplier-orders/closed");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /* ---------- LOAD CLOSED BACKORDERS ---------- */

  const { data: rows, error } = await supabaseAdmin
    .from("customer_backorders")
    .select(`
      id,
      title,
      temp_title,
      quantity,
      payment_status,
      collected_at,
      customer_name,
      products ( name ),
      supplier_purchase_orders (
        po_number
      )
    `)
    .not("collected_at", "is", null)
    .is("cancelled_at", null)
    .order("collected_at", { ascending: false });

  if (error) {
    console.error("❌ supplier closed orders load failed", error);
    throw new Error("Failed to load closed supplier orders");
  }

  /* ---------- RENDER ---------- */

  return (
    <div className="px-8 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">
        Closed supplier orders
      </h1>

      <TableSurface>
        <Table>
          <TableHead>
            <TableRow>
              <HeadCell>Product</HeadCell>
              <HeadCell>Customer</HeadCell>
              <HeadCell>Qty</HeadCell>
              <HeadCell>Payment</HeadCell>
              <HeadCell>PO</HeadCell>
              <HeadCell>Collected</HeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <Cell>
                  <span className="text-sm text-foreground/60">
                    No closed supplier orders yet.
                  </span>
                </Cell>
                <Cell>&nbsp;</Cell>
                <Cell>&nbsp;</Cell>
                <Cell>&nbsp;</Cell>
                <Cell>&nbsp;</Cell>
                <Cell>&nbsp;</Cell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id}>
                  <Cell strong>
                    {b.title ??
                      resolveBackorderTitle({
                        temp_title: b.temp_title,
                        products: b.products,
                      })}
                  </Cell>

                  <Cell>
                    {b.customer_name ?? "Unknown customer"}
                  </Cell>

                  <Cell>{b.quantity}</Cell>

                  <Cell>
                    {b.payment_status === "paid" ? (
                      <span className="text-accent font-medium">
                        Paid
                      </span>
                    ) : (
                      <span className="text-foreground/60">
                        Unpaid
                      </span>
                    )}
                  </Cell>

                  <Cell>
                    {b.supplier_purchase_orders?.[0]?.po_number ?? "—"}
                  </Cell>

                  <Cell>
                    {new Date(b.collected_at).toLocaleString(
                      "en-GB",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
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
