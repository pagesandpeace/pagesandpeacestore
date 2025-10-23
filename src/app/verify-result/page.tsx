// src/app/verify-result/page.tsx
"use client";
import { useSearchParams } from "next/navigation";

export default function VerifyResult() {
  const params = useSearchParams();
  const error = params.get("error");

  if (error === "invalid_token") {
    return <p>❌ Invalid or expired verification link.</p>;
  }

  return <p>✅ Email verified successfully!</p>;
}
