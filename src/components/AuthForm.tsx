"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  mode: "sign-in" | "sign-up";
  onSubmit: (
    formData: FormData
  ) => Promise<{ ok: boolean; userId?: string; redirectTo?: string } | void>;
  redirectTo?: string;
};

export default function AuthForm({ mode, onSubmit, redirectTo = "/account" }: Props) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await onSubmit(formData);
        if (result && typeof result === "object" && "ok" in result && result.ok) {
          if ("redirectTo" in result && result.redirectTo) {
            router.push(result.redirectTo ?? "/account");
          } else {
            router.push(redirectTo);
          }
        } else {
          setError("Sign in/up failed. Please check your details and try again.");
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-10 font-[Montserrat] text-[var(--foreground)]">
      {/* Header — clean and minimal */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-wide text-[var(--accent)]">
          {mode === "sign-in"
            ? "Don’t have an account?"
            : "Already have an account?"}
        </h1>
        <Link
          href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
          className="inline-block text-lg font-semibold underline text-[var(--foreground)] hover:text-[var(--accent)] transition"
        >
          {mode === "sign-in" ? "Sign Up" : "Sign In"}
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-sm text-[#777]">
        <hr className="flex-1 border-t border-[#d6d1cb]" />
        <span className="px-2 whitespace-nowrap">
          Or {mode === "sign-in" ? "sign in" : "sign up"} with
        </span>
        <hr className="flex-1 border-t border-[#d6d1cb]" />
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        {mode === "sign-up" && (
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              autoComplete="name"
              required
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 pr-12 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-[#777] hover:text-[#111] focus:outline-none"
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-[var(--accent)] text-[var(--background)] px-6 py-3 font-semibold text-base hover:bg-[#4e9156] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-60 transition"
        >
          {isPending ? "Please wait…" : mode === "sign-in" ? "Sign In" : "Create Account"}
        </button>

        {mode === "sign-up" && (
          <p className="text-center text-xs text-[#777] mt-3">
            By signing up, you agree to our{" "}
            <a href="#" className="underline text-[var(--accent)]">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline text-[var(--accent)]">
              Privacy Policy
            </a>
            .
          </p>
        )}
      </form>
    </div>
  );
}
