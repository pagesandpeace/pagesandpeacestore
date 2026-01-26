import InStoreSalesForm from "@/components/admin/InStoreSalesForm";

export const revalidate = 0;

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function PhysicalSalesPage() {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-semibold">
          Physical sales
        </h2>
        <p className="text-sm text-muted-foreground">
          Record in-store sales and automatically adjust stock
        </p>
      </div>

      {/* POS SALE UI */}
      <InStoreSalesForm />
    </div>
  );
}
