"use client";

import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { signIn } from "@/lib/auth/actions";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <AuthForm mode="sign-in" onSubmit={signIn} />
    </Suspense>
  );
}
