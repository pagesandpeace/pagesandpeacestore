"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    } else {
      window.location.href = "/dashboard";
    }

    setLoading(false);
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
          invalid={!!errorMsg}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Confirm new password"
          required
          value={confirm}
          invalid={!!errorMsg}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving…" : "Save New Password"}
        </Button>
      </form>
    </div>
  );
}
