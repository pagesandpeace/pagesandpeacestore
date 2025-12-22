"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowser();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setErrorMsg("This password reset link is invalid or has expired.");
        setCheckingSession(false);
        return;
      }

      // Session exists → user is authenticated → allow password change
      setCheckingSession(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setErrorMsg("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Password updated successfully
    window.location.href = "/dashboard";
  }

  if (checkingSession) {
    return <p className="text-center">Verifying reset link…</p>;
  }

  if (errorMsg && !password) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600">{errorMsg}</p>
        <a href="/auth/reset-password" className="underline">
          Request a new reset link
        </a>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold">Set New Password</h1>

      <form className="space-y-4" onSubmit={handleUpdate}>
        <Input
          type="password"
          placeholder="New password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Confirm new password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <Button type="submit" className="w-full">
          Save New Password
        </Button>
      </form>
    </div>
  );
}
