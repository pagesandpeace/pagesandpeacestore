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

  // 🔸 If no token provided → redirect to styled error page
  if (!token) {
    redirect("/verify-error");
  }

  try {
    await auth.api.verifyEmail({ query: { token } });
    console.log("✅ Email verified successfully!");
    // 🔸 Redirect verified users to the callback (usually /verify-success)
    redirect(callbackURL);
  } catch (error) {
    console.error("❌ Email verification failed:", error);
    // 🔸 On any failure → redirect to styled error page
    redirect("/verify-error");
  }
}
