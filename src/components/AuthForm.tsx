"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth/betterAuthClient"; // ⭐ FIXED CLIENT IMPORT

type BetterAuthSocialResult = {
  redirect?: boolean;
  url?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
};

type Props = {
  mode: "sign-in" | "sign-up";
  onSubmit: (
    formData: FormData
  ) => Promise<{ ok: boolean; userId?: string; redirectTo?: string } | void>;
  redirectTo?: string;
  defaultLoyaltyChecked?: boolean;
};

type LoyaltyIntent = {
  acceptedChapters: boolean;
  marketingConsent: boolean;
  termsVersion: string;
  ts: number;
} | null;

export default function AuthForm({
  mode,
  onSubmit,
  redirectTo = "/dashboard",
  defaultLoyaltyChecked = false,
}: Props) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoyaltySignup = searchParams.get("join") === "loyalty";

  const [loyaltyIntent, setLoyaltyIntent] = useState<LoyaltyIntent>(null);

  /* ---------------------------------------------------------
     LOAD LOYALTY INTENT
  --------------------------------------------------------- */
  useEffect(() => {
    if (!isLoyaltySignup) return;
    try {
      const raw = localStorage.getItem("loyaltyIntent");
      if (raw) setLoyaltyIntent(JSON.parse(raw));
    } catch {}
  }, [isLoyaltySignup]);

  const loyaltyChecked = useMemo(
    () => !!loyaltyIntent?.acceptedChapters || defaultLoyaltyChecked,
    [loyaltyIntent, defaultLoyaltyChecked]
  );

  const [marketingChecked, setMarketingChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  /* ---------------------------------------------------------
     ⭐ GOOGLE SIGN-IN HANDLER — FIXED
  --------------------------------------------------------- */
  const handleGoogleSignIn = async () => {
  try {
    setGoogleLoading(true);
    setError(null);

    const result = await authClient.signIn.social({
      provider: "google",
    }) as { data?: BetterAuthSocialResult; error?: any };

    // Error branch
    if (result.error) {
      setError("Google sign-in failed. Please try again.");
      return;
    }

    const data = result.data;

    if (!data) {
      setError("Google sign-in failed. No data returned.");
      return;
    }

    // Redirect-based login
    if (data.redirect && data.url) {
      window.location.href = data.url;
      return;
    }

    // Direct login (no redirect)
    if (data.user) {
      router.refresh();
      router.push("/dashboard");
      return;
    }

    setError("Google sign-in failed. Unknown response.");

  } catch (err) {
    setError("Google sign-in failed. Please try again.");
  } finally {
    setGoogleLoading(false);
  }
};



  /* ---------------------------------------------------------
     EMAIL/PASSWORD FORM SUBMISSION
  --------------------------------------------------------- */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    formData.append("loyaltyprogram", loyaltyChecked ? "true" : "false");

    if (mode === "sign-up" && isLoyaltySignup && loyaltyIntent?.acceptedChapters) {
      formData.append("chaptersAccepted", "true");
      formData.append(
        "chaptersTermsVersion",
        loyaltyIntent.termsVersion || "v1.0"
      );
      formData.append(
        "marketingConsent",
        loyaltyIntent.marketingConsent ? "true" : "false"
      );
    } else if (mode === "sign-up") {
      formData.append("chaptersAccepted", "false");
      formData.append("chaptersTermsVersion", "v1.0");
      formData.append("marketingConsent", marketingChecked ? "true" : "false");
    }

    // Require Terms for sign-up
    if (mode === "sign-up") {
      formData.append("acceptedTerms", termsChecked ? "true" : "false");
      if (!termsChecked) {
        setError("Please accept the Terms and Privacy Policy to continue.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = await onSubmit(formData);

        if (mode === "sign-up") {
          const email = formData.get("email") as string | null;
          if (email) localStorage.setItem("pendingEmail", email);
        }

        if (isLoyaltySignup) localStorage.removeItem("loyaltyIntent");

        if (result && result.ok) {
          router.push(result.redirectTo ?? redirectTo);
        } else {
          setError("Sign in/up failed. Please check your details and try again.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  /* ---------------------------------------------------------
     UI RENDER
  --------------------------------------------------------- */
  return (
    <div className="space-y-10 font-[Montserrat] text-foreground">

      {/* ⭐ GOOGLE SIGN-IN BUTTON */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="
          w-full flex items-center justify-center gap-3
          rounded-full border border-[#d6d1cb]
          bg-white px-6 py-3 font-semibold text-foreground
          hover:bg-[#f9f7f3] transition
        "
      >
        {googleLoading ? (
          "Connecting…"
        ) : (
          <>
            <img src="/google_logo.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 text-sm text-[#777]">
        <hr className="flex-1 border-t border-[#d6d1cb]" />
        <span className="px-2 whitespace-nowrap">
          Or {mode === "sign-in" ? "sign in" : "sign up"} with email
        </span>
        <hr className="flex-1 border-t border-[#d6d1cb]" />
      </div>

      {/* HEADER SWITCH */}
      {!isLoyaltySignup && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-wide text-accent">
            {mode === "sign-in" ? "Don’t have an account?" : "Already have an account?"}
          </h1>

          <Link
            href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="inline-block text-lg font-semibold underline text-foreground hover:text-accent transition"
          >
            {mode === "sign-in" ? "Sign Up" : "Sign In"}
          </Link>
        </div>
      )}

      {/* FORM */}
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>

        {/* NAME */}
        {mode === "sign-up" && (
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3"
              autoComplete="name"
              required
            />
          </div>
        )}

        {/* EMAIL */}
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3"
            autoComplete="email"
            required
          />
        </div>

        {/* PASSWORD */}
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 pr-12"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-[#777] hover:text-[#111]"
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* TERMS (SIGN-UP ONLY) */}
        {mode === "sign-up" && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              className="mt-1 accent-accent"
              required
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" className="underline text-accent">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="underline text-accent">Privacy Policy</a>.
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-accent text-background px-6 py-3 font-semibold"
        >
          {isPending ? "Please wait…" : mode === "sign-in" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
