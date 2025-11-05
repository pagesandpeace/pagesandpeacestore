"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function VerifyPending() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const email = localStorage.getItem("pendingEmail");

      if (!email) {
        setError("No pending email found. Please sign up again.");
        setResending(false);
        return;
      }

      const res = await fetch("/api/auth/resend-verification", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: localStorage.getItem("pendingEmail") }),
});


      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Verification email sent again. Please check your inbox (and spam).");

        // Auto-clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.error || "Unable to resend email. Please try again later.");
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* --- Logo --- */}
      <Image
        src="/p&p_logo_cream.svg"
        alt="Pages & Peace logo"
        width={120}
        height={120}
        priority
        className="mb-6"
      />

      {/* --- Heading --- */}
      <h1 className="font-[Montserrat] text-3xl sm:text-4xl text-[var(--foreground)] tracking-widest">
        VERIFY YOUR EMAIL
      </h1>

      {/* --- Main Message --- */}
      <p className="mt-6 text-[var(--foreground)]/80 text-lg max-w-md leading-relaxed">
        We’ve sent a confirmation email to your inbox. Please click the verification link inside to
        complete your sign-up. ☕ Once verified, you’ll be able to access your account and start
        exploring Pages & Peace.
      </p>

      {/* --- Helpful Tips --- */}
      <div className="mt-6 text-[var(--foreground)]/70 text-sm max-w-sm leading-relaxed">
        Didn’t receive the email?
        <br />
        • Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
        <br />
        • Mark the message as <strong>“Not spam”</strong> so future emails reach your inbox.
      </div>

      {/* --- Resend Button --- */}
      <button
        onClick={handleResend}
        disabled={resending}
        className="mt-8 px-6 py-2.5 rounded-full bg-[var(--accent)] text-[var(--background)] font-semibold hover:opacity-90 transition disabled:opacity-60"
      >
        {resending ? "Sending..." : "Resend Verification Email"}
      </button>

      {/* --- Feedback Messages --- */}
      {message && (
        <p className="mt-4 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-md">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 px-4 py-2 rounded-md">
          {error}
        </p>
      )}

      {/* --- Return Home --- */}
      <Link
        href="/"
        className="mt-10 inline-block px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--background)] font-semibold text-lg hover:opacity-90 transition-all"
      >
        🏡 Return Home
      </Link>
    </main>
  );
}
