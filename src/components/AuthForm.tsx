"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
          // ✅ If backend specifies a custom redirect (like verify-pending), use it
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
    <div className="space-y-8 font-[Montserrat] text-[#111]">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm text-[#111]/70">
          {mode === "sign-in" ? "Don’t have an account? " : "Already have an account? "}
          <Link
            href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="underline text-[#5DA865] font-medium hover:opacity-80"
          >
            {mode === "sign-in" ? "Sign Up" : "Sign In"}
          </Link>
        </p>

        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold text-[#111] tracking-wide">
          {mode === "sign-in" ? "Welcome Back ☕" : "Join Pages & Peace 📚"}
        </h1>
        <p className="mt-2 text-base text-[#111]/70">
          {mode === "sign-in"
            ? "Sign in to continue your story."
            : "Create your account and start your next chapter."}
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <hr className="h-px w-full border-0 bg-[#d6d1cb]" />
        <span className="text-sm text-[#777]">
          Or {mode === "sign-in" ? "sign in" : "sign up"} with
        </span>
        <hr className="h-px w-full border-0 bg-[#d6d1cb]" />
      </div>

      {/* Form */}
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {mode === "sign-up" && (
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-[#111]">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[#5DA865]/40"
              autoComplete="name"
              required
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-[#111]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[#5DA865]/40"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-[#111]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-[#ccc] bg-white px-4 py-3 pr-12 text-[#111] placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-[#5DA865]/40"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-sm text-[#555] hover:text-[#111]"
              onClick={() => setShow((v) => !v)}
            >
              {show ? "Hide" : "Show"}
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
          className="w-full rounded-full bg-[#5DA865] text-[#FAF6F1] px-6 py-3 font-semibold text-base hover:bg-[#4e9156] focus:outline-none focus:ring-2 focus:ring-[#5DA865]/40 disabled:opacity-60"
        >
          {isPending ? "Please wait…" : mode === "sign-in" ? "Sign In" : "Create Account"}
        </button>

        {mode === "sign-up" && (
          <p className="text-center text-xs text-[#777] mt-2">
            By signing up, you agree to our{" "}
            <a href="#" className="underline text-[#5DA865]">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline text-[#5DA865]">
              Privacy Policy
            </a>
            .
          </p>
        )}
      </form>
    </div>
  );
}
