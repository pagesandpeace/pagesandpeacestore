"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useSearchParams } from "next/navigation";
import ErrorModal from "@/components/ui/ErrorModal";

export default function SignInClient() {
  const supabase = supabaseBrowser();

  const searchParams = useSearchParams();

  const callbackURL = searchParams.get("callbackURL") || "/dashboard";
  const defaultEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(defaultEmail);
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
     MAGIC LINK (BACKEND CONTROLLED)
  -------------------------------------------------- */
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();

    // Prevent double-click / double-submit
    if (loading || emailSent) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-magic-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          callbackURL,
          intent: "signin", // 🔥 required
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Failed to send link");
        setLoading(false);
        return;
      }

      setEmailSent(true);
    } catch (err) {
      console.error(err);
      showError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------------------------
     GOOGLE SIGN-IN
  -------------------------------------------------- */
  async function handleGoogle() {
    if (loading || googleLoading || emailSent) return;

    setGoogleLoading(true);

    const params = new URLSearchParams();

    params.set("callbackURL", callbackURL);
    params.set("intent", "signin");

    // ✅ IMPORTANT: explicitly mark no consent
    params.set("marketing_consent", "false");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?${params.toString()}`,
      },
    });

    if (error) {
      showError(error.message);
      setGoogleLoading(false);
    }
  }

  /* --------------------------------------------------
     EMAIL SENT STATE
  -------------------------------------------------- */
  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <div className="text-4xl">📩</div>

        <h1 className="text-2xl font-semibold text-[#111]">
          Check your email
        </h1>

        <p className="text-[#555]">
          We’ve sent you a secure login link:
        </p>

        <div className="font-medium text-[#111] break-all">
          {email}
        </div>

        <div className="text-sm text-[#666] space-y-2">
          <p>Click the newest link once to access your account.</p>
          <p>⏱ It may take a minute to arrive.</p>
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
     MAIN FORM
  -------------------------------------------------- */
  return (
    <div className="w-full space-y-8">
      <ErrorModal
        open={errorOpen}
        message={errorMessage}
        onClose={() => setErrorOpen(false)}
      />

      <h1 className="text-3xl font-semibold text-[#111]">
        Sign In
      </h1>

      {/* GOOGLE */}
      <button
        onClick={handleGoogle}
        disabled={loading || googleLoading || emailSent}
        className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-lg border border-[#D6C28B] hover:bg-[#f1ede4] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </span>
      </button>

      {/* DIVIDER */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#e4ddd5]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#FAF6F1] text-[#6b665d]">
            or use email
          </span>
        </div>
      </div>

      {/* MAGIC LINK */}
      <form onSubmit={handleMagicLink} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          className="border p-3 w-full rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          value={email}
          disabled={loading || emailSent}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button
          type="submit"
          disabled={loading || emailSent}
          className="w-full"
        >
          {loading ? "Sending link…" : "Send login link"}
        </Button>
      </form>

      <p className="text-xs text-[#6b665d] text-center">
        We’ll email you a secure link — no password needed.
      </p>

      <p className="text-center text-sm">
        No account?{" "}
        <Link href="/sign-up" className="underline font-semibold">
          Create one
        </Link>
      </p>
    </div>
  );
}