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

  const callbackURL = searchParams.get("callbackURL") || "/dashboard";
  const joinIntent = searchParams.get("join");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [emailSent, setEmailSent] = useState(false);

  /* --------------------------------------------------
     AUTO LOYALTY
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
    } catch {}
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

        // ✅🔥 CRITICAL FIX HERE
        data: {
          name,
          marketing_consent: marketingConsent,
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Check your email inbox to confirm your account!");
      setLoading(false);
      return;
    }

    await autoJoinLoyaltyIfNeeded();

    setEmailSent(true);
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

  /* --------------------------------------------------
     EMAIL SENT SCREEN
  -------------------------------------------------- */
  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <div className="text-4xl">📩</div>

        <h1 className="text-2xl font-semibold text-[#111]">
          Confirm your email
        </h1>

        <p className="text-[#555]">
          We’ve sent a confirmation link to:
        </p>

        <div className="font-medium text-[#111] break-all">
          {email}
        </div>

        <div className="text-sm text-[#666] space-y-2">
          <p>Click the link in that email to activate your account.</p>
          <p>⏱ It can take a minute or two to arrive.</p>
          <p>
            📬 Check your <strong>spam or junk folder</strong> if you don’t see it.
          </p>
        </div>

        <div className="border-t border-[#e4ddd5] my-4" />

        <div className="text-sm text-[#777] space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="underline hover:text-[#111]"
          >
            Try again
          </button>

          <p>or email admin@pagesandpeace.co.uk</p>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     FORM
  -------------------------------------------------- */
  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold text-[#111]">
        Create your account
      </h1>

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

        {/* ✅ CONSENT */}
        <label className="flex items-start gap-2 text-sm text-[#444]">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-1"
          />
          <span>
            Send me updates, events and book drops by email.
          </span>
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#e4ddd5]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#FAF6F1] text-[#6b665d]">
            or sign up faster
          </span>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4]"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>{googleLoading ? "Connecting…" : "Sign up with Google"}</span>
      </button>

      <p className="text-xs text-[#6b665d] text-center mt-2">
        You can unsubscribe at any time.
      </p>

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