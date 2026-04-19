"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useSearchParams } from "next/navigation";
import ErrorModal from "@/components/ui/ErrorModal";

export default function SignUpClient() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();

  const callbackURL = searchParams.get("callbackURL") || "/dashboard";
  const joinIntent = searchParams.get("join");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // ✅ NEW
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [emailSent, setEmailSent] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);

  function showError(msg: string) {
    setErrorMessage(msg);
    setErrorOpen(true);
  }

  /* --------------------------------------------------
     AUTO LOYALTY (OPTIONAL)
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
     SIGN UP = MAGIC LINK
  -------------------------------------------------- */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const fullName = `${firstName} ${lastName}`.trim();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?callbackURL=${encodeURIComponent(
          callbackURL
        )}${joinIntent === "loyalty" ? "&join=loyalty" : ""}`,

        // ✅ CRITICAL: METADATA FOR CALLBACK
        data: {
          name: fullName,
          first_name: firstName,
          last_name: lastName,
          marketing_consent: marketingConsent,
        },
      },
    });

    if (error) {
      showError(error.message);
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

    if (error) showError(error.message);
    setGoogleLoading(false);
  }

  /* --------------------------------------------------
     EMAIL SENT SCREEN
  -------------------------------------------------- */
  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <div className="text-4xl">✨</div>

        <h1 className="text-2xl font-semibold text-[#111]">
          You&apos;re almost in
        </h1>

        <p className="text-[#555]">
          We&apos;ve sent your secure access link to:
        </p>

        <div className="font-medium text-[#111] break-all">
          {email}
        </div>

        <div className="text-sm text-[#666] space-y-2">
          <p>Click the link to enter your account instantly.</p>
          <p>⏱ It can take a minute to arrive.</p>
          <p>
            📬 Check your <strong>spam or junk folder</strong> if needed.
          </p>
        </div>

        <div className="border-t border-[#e4ddd5] my-4" />

        <button
          onClick={() => setEmailSent(false)}
          className="underline text-sm hover:text-[#111]"
        >
          Use a different email
        </button>
      </div>
    );
  }

  /* --------------------------------------------------
     FORM
  -------------------------------------------------- */
  return (
    <div className="w-full space-y-8">
      <ErrorModal
        open={errorOpen}
        message={errorMessage}
        onClose={() => setErrorOpen(false)}
      />

      <h1 className="text-3xl font-semibold text-[#111]">
        Create your account
      </h1>

      {/* GOOGLE */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4]"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>
          {googleLoading ? "Connecting…" : "Sign up with Google"}
        </span>
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
        {/* NAME */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="First name"
            required
            className="border p-3 w-full rounded-lg"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last name"
            required
            className="border p-3 w-full rounded-lg"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email address"
          required
          className="border p-3 w-full rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* ✅ MARKETING CONSENT */}
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
          {loading ? "Creating…" : "Continue"}
        </Button>
      </form>

      <p className="text-xs text-[#6b665d] text-center">
        No password needed. We&apos;ll send you a secure login link.
      </p>

      <p className="text-center text-sm">
        Already have an account{" "}
        <Link
          href={`/sign-in${joinIntent ? `?join=${joinIntent}` : ""}`}
          className="underline font-semibold"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}