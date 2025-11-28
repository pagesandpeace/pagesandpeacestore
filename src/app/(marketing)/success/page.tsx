// src/app/(marketing)/success/page.tsx
import { Suspense } from "react";
import SuccessContent from "./SuccessContent";

export default function SuccessPageWrapper() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <SuccessContent />
    </Suspense>
  );
}
