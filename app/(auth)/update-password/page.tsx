"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowser();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // This listener fires when Supabase processes the recovery token
    const { data } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setLoading(false);
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  if (loading) {
    return <p className="text-center">Verifying reset link…</p>;
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

        <Button type="submit" disabled={loading} className="w-full">
          Save New Password
        </Button>
      </form>
    </div>
  );
}
