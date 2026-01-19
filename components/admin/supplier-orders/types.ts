/* ---------------------------------------------
   SHARED ENUMS
--------------------------------------------- */

export type PaymentStatus =
  | "unpaid"
  | "paid";

/* ---------------------------------------------
   LINE ITEM (BACKORDER-LEVEL FACTS)
--------------------------------------------- */

export type LineItem = {
  backorder_id: string;
  product_name: string;

  // What the customer originally requested (read-only)
  requested_quantity: number;

  // What was ordered from the supplier (authoritative)
  quantity: number;

  // How many units have been received so far (can be partial)
  received_quantity: number | null;

  // Supplier linkage
  supplier_po_id: string | null;

  // Lifecycle timestamps (per-item, authoritative)
  ordered_at: string | null;
  received_at: string | null;

  // Closure / cancellation
  cancelled_at: string | null;
  collected_at: string | null;
};

/* ---------------------------------------------
   CUSTOMER GROUP
--------------------------------------------- */

export type CustomerGroup = {
  customer_id: string;

  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;

  // Customer-level payment status (admin flag)
  payment_status: PaymentStatus;

  items: LineItem[];
};


/* ---------------------------------------------
   SUPPLIER ORDER GROUP (PO-LEVEL CONTEXT)
--------------------------------------------- */

export type SupplierOrderGroup = {
  po_id: string | null;
  supplier_name: string | null;
  po_number: string | null;

  created_at?: string | null;
  ordered_at?: string | null;
  collected_at?: string | null;

  // ✅ NEW (derived, informational)
  received_range?: {
    from: string | null;
    to: string | null;
  };

  customers: CustomerGroup[];
};

