"use client";

import BackorderForm from "@/components/admin/BackorderForm";
import InStoreSalesForm from "@/components/admin/InStoreSalesForm";

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function BackordersPage() {
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-16">
      <h1 className="text-3xl font-bold"> Sales & Backorders</h1>

      {/* ===============================
         BACKORDERS
      =============================== */}
      <BackorderForm />

      {/* ===============================
         IN-STORE SALES
      =============================== */}
      <InStoreSalesForm />
    </div>
  );
}
