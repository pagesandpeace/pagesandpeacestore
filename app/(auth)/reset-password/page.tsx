"use client";

import { Suspense } from "react";
import ResetPasswordInner from "./reset-password-inner";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
