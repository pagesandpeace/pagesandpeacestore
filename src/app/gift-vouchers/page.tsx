import GiftVouchersClient from "./GiftVouchersClient";

export default function GiftVouchersPage() {
  // 👇 Publicly accessible — auth handled inside the client
  return <GiftVouchersClient />;
}
