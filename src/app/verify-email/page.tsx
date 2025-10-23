// src/app/verify-email/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({ searchParams }: any) {
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;
  const callbackURL =
    typeof searchParams?.callbackURL === "string"
      ? searchParams.callbackURL
      : "/verify-success";

  if (!token) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F1] text-[#111]">
        <h1 className="text-2xl font-montserrat">❌ Invalid Verification Link</h1>
        <p className="mt-2 text-[#111]/70">
          The verification link is invalid or missing a token.
        </p>
      </main>
    );
  }

  try {
    await auth.api.verifyEmail({ query: { token } });
    console.log("✅ Email verified successfully!");
    redirect(callbackURL);
  } catch (error) {
    console.error("❌ Email verification failed:", error);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F1] text-[#111]">
        <h1 className="text-2xl font-montserrat">⚠️ Verification Failed</h1>
        <p className="mt-2 text-[#111]/70">
          This verification link may have expired or already been used.
        </p>
      </main>
    );
  }
}
