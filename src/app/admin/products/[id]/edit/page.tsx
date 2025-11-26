export const dynamic = "force-dynamic";

import EditRouter from "@/components/admin/product-editors/EditRouter";
import { use } from "react";

export default function Page(props: { params: Promise<{ id: string }> }) {
  // ⛔ params is a promise now — MUST unwrap with use()
  const { id } = use(props.params);

  return <EditRouter id={id} />;
}
