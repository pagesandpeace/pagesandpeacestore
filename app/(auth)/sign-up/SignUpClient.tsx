"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useSearchParams } from "next/navigation";

export default function SignUpClient() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();

  const callbackURL = searchParams.get("callbackURL") || "/cart";
  const joinIntent = searchParams.get("join");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* --------------------------------------------------
     AUTO LOYALTY OPT-IN (SAFE + IDEMPOTENT)
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
    } catch (err) {
      console.warn("Auto loyalty opt-in failed:", err);
    }
  }

  /* --------------------------------------------------
     EMAIL SIGN-UP
  -------------------------------------------------- */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?callbackURL=${encodeURIComponent(
          callbackURL
        )}${joinIntent === "loyalty" ? "&join=loyalty" : ""}`,
        data: { name },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 200));
    const { data: sess } = await supabase.auth.getSession();

    if (data.user && sess.session) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        name,
        image: null,
        role: "customer",
        auth_provider: "credentials",
      });

      if (insertError) {
        alert("Profile insert failed: " + insertError.message);
        setLoading(false);
        return;
      }

      await autoJoinLoyaltyIfNeeded();
    }

    alert("Check your email inbox to confirm your account!");
    setLoading(false);
  }

  /* --------------------------------------------------
     GOOGLE SIGN-UP
  -------------------------------------------------- */
  async function handleGoogle() {
    setGoogleLoading(true);

    const params = new URLSearchParams();
    params.set("callbackURL", callbackURL);

    if (joinIntent === "loyalty") {
      params.set("join", "loyalty");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?${params.toString()}`,
      },
    });

    if (error) alert(error.message);
    setGoogleLoading(false);
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold text-[#111]">
        Create your account
      </h1>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4]"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>{googleLoading ? "Connecting…" : "Sign up with Google"}</span>
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

      <form onSubmit={handleSignUp} className="space-y-4">
        <input
          type="text"
          placeholder="Full name"
          required
          className="border p-3 w-full rounded-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email address"
          required
          className="border p-3 w-full rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          className="border p-3 w-full rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/sign-in${joinIntent ? "?join=loyalty" : ""}`}
          className="underline font-semibold"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
