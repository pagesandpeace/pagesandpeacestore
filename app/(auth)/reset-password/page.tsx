"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get("code");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔐 DEFENSIVE REDIRECT:
  // If Supabase lands here with a recovery code, forward immediately
  useEffect(() => {
    if (code) {
      router.replace(`/update-password?code=${code}`);
    }
  }, [code, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus(
        "If an account exists for this email, we’ve sent a secure reset link."
      );
    }

    setLoading(false);
  }

  // If redirecting, render nothing
  if (code) return null;

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold">Reset password</h1>

      <form className="space-y-4" onSubmit={handleReset}>
        <Input
          type="email"
          placeholder="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      {status && (
        <p className="text-sm text-[#444] text-center">{status}</p>
      )}

      <p className="text-center text-sm">
        Remember your password?{" "}
        <Link href="/auth/sign-in" className="underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
