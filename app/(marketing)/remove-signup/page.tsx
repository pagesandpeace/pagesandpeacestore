"use client";

import { Suspense } from "react";
import RemoveSignupClient from "./RemoveSignupClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RemoveSignupClient />
    </Suspense>
  );
}