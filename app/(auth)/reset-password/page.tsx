"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Check your email for a reset link.");
    }

    setLoading(false);
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold">Reset Password</h1>

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

      {status && <p className="text-sm text-[#444]">{status}</p>}

      <p className="text-center text-sm">
        Remember your password?{" "}
        <Link href="/auth/sign-in" className="underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
