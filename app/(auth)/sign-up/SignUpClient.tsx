"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignUpClient() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();

const callbackURL = searchParams.get("callbackURL") || "/dashboard";  const joinIntent = searchParams.get("join");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [emailSent, setEmailSent] = useState(false); // ✅ NEW

  /* --------------------------------------------------
     AUTO LOYALTY OPT-IN
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
        data: { name },
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

    const res = await fetch("/api/profile/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_user_id: data.user.id,
        email,
        name,
        marketing_consent: marketingConsent,
      }),
    });

    if (!res.ok) {
      alert("Profile creation failed");
      setLoading(false);
      return;
    }

    await autoJoinLoyaltyIfNeeded();

    // ✅ SWITCH TO SUCCESS STATE INSTEAD OF REDIRECT
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
     ✅ EMAIL SENT SCREEN
  -------------------------------------------------- */
  if (emailSent) {
    return (
      <div className="w-full space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-[#111]">
          Check your email 📩
        </h1>

        <p className="text-[#555]">
          We’ve sent a confirmation link to:
          <br />
          <span className="font-medium text-[#111]">{email}</span>
        </p>

        <p className="text-sm text-[#777]">
          Click the link in the email to activate your account and continue.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="underline text-sm mt-4"
        >
          Try again
        </button>
      </div>
    );
  }

  /* --------------------------------------------------
     DEFAULT SIGN-UP FORM
  -------------------------------------------------- */
  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold text-[#111]">
        Create your account
      </h1>

      {/* ---------------- EMAIL FORM ---------------- */}
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

        {/* NEWSLETTER CONSENT */}
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

      {/* ---------------- DIVIDER ---------------- */}
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

      {/* ---------------- GOOGLE BUTTON ---------------- */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4]"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>{googleLoading ? "Connecting…" : "Sign up with Google"}</span>
      </button>

      {/* GOOGLE CONSENT */}
      <p className="text-xs text-[#6b665d] text-center mt-2">
        By continuing, you may receive occasional emails about events and
        updates. You can unsubscribe anytime.
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