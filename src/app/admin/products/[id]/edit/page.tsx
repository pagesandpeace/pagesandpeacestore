// REMOVE ANY "use client" ‼
// This file MUST be server-side.

import EditRouter from "@/components/admin/product-editors/EditRouter";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { id: string } }) {
  // Server components CAN read params synchronously
  return <EditRouter id={params.id} />;
}
