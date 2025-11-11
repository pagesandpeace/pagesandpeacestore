// AuthForm.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoyaltySignup = searchParams.get("join") === "loyalty";

  const [loyaltyIntent, setLoyaltyIntent] = useState<LoyaltyIntent>(null);
  useEffect(() => {
    if (!isLoyaltySignup) return;
    try {
      const raw = localStorage.getItem("loyaltyIntent");
      if (raw) setLoyaltyIntent(JSON.parse(raw) as LoyaltyIntent);
    } catch {}
  }, [isLoyaltySignup]);

  const loyaltyChecked = useMemo(
    () => !!loyaltyIntent?.acceptedChapters || defaultLoyaltyChecked,
    [loyaltyIntent, defaultLoyaltyChecked]
  );

  const [marketingChecked, setMarketingChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false); // account ToS/Privacy (sign-up only)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // always carry basic flag
    formData.append("loyaltyprogram", loyaltyChecked ? "true" : "false");

    // loyalty intent (only meaningful for sign-up flows)
    if (mode === "sign-up" && isLoyaltySignup && loyaltyIntent?.acceptedChapters) {
      formData.append("chaptersAccepted", "true");
      formData.append("chaptersTermsVersion", loyaltyIntent.termsVersion || "v1.0");
      formData.append(
        "marketingConsent",
        loyaltyIntent.marketingConsent ? "true" : "false"
      );
    } else if (mode === "sign-up") {
      // fallback only for sign-up
      formData.append("chaptersAccepted", "false");
      formData.append("chaptersTermsVersion", "v1.0");
      formData.append("marketingConsent", marketingChecked ? "true" : "false");
    }

    // ✅ Only enforce ToS/Privacy on SIGN-UP
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

        if (isLoyaltySignup) {
          localStorage.removeItem("loyaltyIntent");
        }

        if (result && typeof result === "object" && "ok" in result && result.ok) {
          router.push(result.redirectTo ?? redirectTo);
        } else {
          setError("Sign in/up failed. Please check your details and try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-10 font-[Montserrat] text-[var(--foreground)]">
      {!isLoyaltySignup && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-wide text-[var(--accent)]">
            {mode === "sign-in" ? "Don’t have an account?" : "Already have an account?"}
          </h1>
          <Link
            href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="inline-block text-lg font-semibold underline text-[var(--foreground)] hover:text-[var(--accent)] transition"
          >
            {mode === "sign-in" ? "Sign Up" : "Sign In"}
          </Link>
        </div>
      )}

      {mode === "sign-up" && isLoyaltySignup && (
        <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3 text-sm">
          <p className="text-[var(--foreground)]/85">
            🌿 You’re joining the <strong>Pages & Peace Chapters Club</strong>.
            {loyaltyIntent?.acceptedChapters
              ? " We’ve recorded your club consent from the previous step."
              : " You can complete your club consent after creating your account."}
          </p>
        </div>
      )}

      {!isLoyaltySignup && (
        <div className="flex items-center gap-3 text-sm text-[#777]">
          <hr className="flex-1 border-t border-[#d6d1cb]" />
          <span className="px-2 whitespace-nowrap">
            Or {mode === "sign-in" ? "sign in" : "sign up"} with
          </span>
          <hr className="flex-1 border-t border-[#d6d1cb]" />
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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

        {/* Account ToS/Privacy — shown & required ONLY on sign-up */}
        {mode === "sign-up" && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              className="mt-1 accent-[var(--accent)]"
              required
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" className="underline text-[var(--accent)]">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="underline text-[var(--accent)]">Privacy Policy</a>.
            </span>
          </label>
        )}

        {/* Fallback marketing checkbox ONLY when sign-up + loyalty path with no stored intent */}
        {mode === "sign-up" && isLoyaltySignup && !loyaltyIntent && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={marketingChecked}
              onChange={(e) => setMarketingChecked(e.target.checked)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>I consent to receive updates and offers from Pages & Peace.</span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-[var(--accent)] text-[var(--background)] px-6 py-3 font-semibold"
        >
          {isPending ? "Please wait…" : mode === "sign-in" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
