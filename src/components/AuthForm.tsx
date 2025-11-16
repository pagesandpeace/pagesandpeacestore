"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { authClient } from "@/lib/auth/betterAuthClient";

type AuthResult = {
  ok: boolean;
  userId?: string;
  redirectTo?: string;
  type?: string;  // more flexible because signIn returns arbitrary type
  message?: string;
} | void;


type Props = {
  mode: "sign-in" | "sign-up";
  onSubmit: (formData: FormData) => Promise<AuthResult>;
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
  
  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // ⭐ ALWAYS OWNED BY AuthForm, NOT THE PAGE
  const callbackURL = searchParams.get("callbackURL") || redirectTo;

  const isLoyaltySignup = searchParams.get("join") === "loyalty";

  const [loyaltyIntent, setLoyaltyIntent] = useState<LoyaltyIntent>(null);
  const [termsChecked, setTermsChecked] = useState(false);

  /* ---------------------------------------------------------
     LOAD STORED LOYALTY INTENT
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

  /* ---------------------------------------------------------
     GOOGLE SIGN-IN
  --------------------------------------------------------- */
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      const data = result.data;
      if (!data) {
        setError("Google sign-in failed.");
        return;
      }

      if ("redirect" in data && data.redirect && data.url) {
        window.location.href = data.url;
        return;
      }

      if ("user" in data && data.user) {
        router.refresh();
        router.push(callbackURL);
        return;
      }

      setError("Google sign-in failed.");
    } catch {
      setError("Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ---------------------------------------------------------
     EMAIL + PASSWORD SUBMIT
  --------------------------------------------------------- */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // append callbackURL inside form
    formData.append("callbackURL", callbackURL);
    formData.append("loyaltyprogram", loyaltyChecked ? "true" : "false");

    if (mode === "sign-up") {
      formData.append("acceptedTerms", termsChecked ? "true" : "false");
      if (!termsChecked) {
        setError("Please accept the Terms and Privacy Policy.");
        return;
      }
    }

    startTransition(async () => {
      let result: AuthResult;

      try {
        result = await onSubmit(formData);
      } catch {
        setError("Something went wrong.");
        return;
      }

      if (!result) {
        setError("Something went wrong.");
        return;
      }

      if (result.type === "google-only") {
        setError("This email is linked to a Google account. Please sign in with Google.");
        return;
      }

      if (result.type === "invalid-credentials") {
        setError("Incorrect email or password.");
        return;
      }

      if (result.type === "validation") {
        setError(result.message || "Invalid input.");
        return;
      }

      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.ok) {
        router.push(callbackURL);
        return;
      }

      setError("Something went wrong.");
    });
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <div className="space-y-10 font-[Montserrat] text-foreground">

      {/* GOOGLE BUTTON */}
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
        {googleLoading ? "Connecting…" : (
          <>
            <Image src="/google_logo.svg" alt="Google" width={20} height={20} />
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
            {mode === "sign-in"
              ? "Don’t have an account?"
              : "Already have an account?"}
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

        {mode === "sign-up" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3"
              required
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <input
              name="password"
              type={show ? "text" : "password"}
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 pr-12"
              minLength={8}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-[#777]"
              onClick={() => setShow(v => !v)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

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
