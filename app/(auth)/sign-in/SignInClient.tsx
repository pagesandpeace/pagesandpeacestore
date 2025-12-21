"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useSearchParams, useRouter } from "next/navigation";
import ErrorModal from "@/components/ui/ErrorModal";

export default function SignInClient() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackURL = searchParams.get("callbackURL") || null;
  const joinIntent = searchParams.get("join");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);

  function showError(msg: string) {
    setErrorMessage(msg);
    setErrorOpen(true);
  }

  /* --------------------------------------------------
     AUTO LOYALTY OPT-IN (IDEMPOTENT)
  -------------------------------------------------- */
  async function autoJoinLoyaltyIfNeeded() {
    if (joinIntent !== "loyalty") return;

    try {
      await fetch("/api/loyalty/optin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          termsVersion: "v1.0",
          marketingConsent: true,
        }),
      });

      localStorage.setItem("pp:loyalty-confirmed", "true");
    } catch {
      // silent failure
    }
  }

  /* --------------------------------------------------
     EMAIL SIGN-IN
  -------------------------------------------------- */
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: userRow } = await supabase
      .from("users")
      .select("auth_provider")
      .eq("email", email)
      .maybeSingle();

    if (userRow?.auth_provider === "google") {
      showError("This account was created using Google. Please sign in with Google.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      setLoading(false);
      return;
    }

    await autoJoinLoyaltyIfNeeded();

    const res = await fetch("/api/me", { cache: "no-store" });
    const me = await res.json();
    const role = me?.role || me?.user?.role;

    if (role === "admin") {
      router.push("/admin");
      return;
    }

    router.push(callbackURL || "/dashboard");
  }

  /* --------------------------------------------------
     GOOGLE SIGN-IN
  -------------------------------------------------- */
  async function handleGoogle() {
    setGoogleLoading(true);

    const redirectParams = new URLSearchParams();
    redirectParams.set("callbackURL", callbackURL || "/dashboard");

    if (joinIntent === "loyalty") {
      redirectParams.set("join", "loyalty");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?${redirectParams.toString()}`,
      },
    });

    if (error) showError(error.message);
    setGoogleLoading(false);
  }

  return (
    <div className="w-full space-y-8">
      <ErrorModal
        open={errorOpen}
        message={errorMessage}
        onClose={() => setErrorOpen(false)}
      />

      <h1 className="text-3xl font-semibold text-[#111]">Sign In</h1>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4]"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>{googleLoading ? "Connecting…" : "Sign in with Google"}</span>
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#e4ddd5]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#FAF6F1] text-[#6b665d]">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          className="border p-3 w-full rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          required
          placeholder="Password"
          className="border p-3 w-full rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link href="/reset-password" className="underline">
          Forgot password?
        </Link>
      </div>

      <p className="text-center text-sm">
        No account?{" "}
        <Link
          href={`/sign-up${joinIntent ? "?join=loyalty" : ""}`}
          className="underline font-semibold"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
