"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyResult() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat,Arial,sans-serif]">
      <div className="bg-white shadow-md rounded-2xl p-8 text-center max-w-md">
        {error === "invalid_token" ? (
          <>
            <h1 className="text-2xl font-semibold mb-4">⚠️ Verification Failed</h1>
            <p className="text-gray-700 mb-6">
              The verification link is invalid or has expired.
            </p>
            <Link
              href="/sign-in"
              className="inline-block bg-[#5DA865] text-white px-6 py-3 rounded-lg hover:bg-[#4b8a55] transition"
            >
              Return to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-4">🎉 Email Verified!</h1>
            <p className="text-gray-700 mb-6">
              Your email has been successfully verified.
            </p>
            <Link
              href="/"
              className="inline-block bg-[#5DA865] text-white px-6 py-3 rounded-lg hover:bg-[#4b8a55] transition"
            >
              Go to Homepage
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
