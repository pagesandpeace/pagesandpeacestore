import { SupabaseClient } from "@supabase/supabase-js";

export async function resolveSupplierPO(
  supabase: SupabaseClient,
  supplierPoId: string
) {
  const { count, error } = await supabase
    .from("customer_backorders")
    .select("id", { count: "exact", head: true })
    .eq("supplier_po_id", supplierPoId)
    .is("cancelled_at", null)
    .lt("received_quantity", "quantity");

  if (error) {
    throw error;
  }

  // No unresolved lines left → close PO
  if (count === 0) {
    await supabase
      .from("supplier_purchase_orders")
      .update({ received_at: new Date().toISOString() })
      .eq("id", supplierPoId);
  }
}
