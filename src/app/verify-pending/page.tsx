import Link from "next/link";
import Image from "next/image";

export default function VerifyPending() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Logo */}
      <Image
        src="/p&p_logo_cream.svg"
        alt="Pages & Peace logo"
        width={120}
        height={120}
        className="mb-6"
      />

      {/* Heading */}
      <h1 className="font-[Montserrat] text-3xl sm:text-4xl text-[#111111] tracking-widest">
        VERIFY YOUR EMAIL
      </h1>

      {/* Message */}
      <p className="mt-6 text-[#111111]/80 text-lg max-w-md">
        We’ve sent a confirmation email to your inbox.  
        Please click the verification link inside to complete your sign-up.  
        ☕ Once verified, you’ll be able to access your account and start exploring Pages & Peace.
      </p>

      {/* Tips */}
      <p className="mt-6 text-[#111111]/60 text-sm max-w-sm">
        Didn’t receive the email?  
        Check your spam folder, or try signing up again using the same email.
      </p>

      {/* Back to Home */}
      <Link
        href="/"
        className="mt-10 px-8 py-3 bg-[#5DA865] text-[#FAF6F1] rounded-full font-semibold text-lg hover:opacity-90 transition-all"
      >
        🏡 Return Home
      </Link>
    </main>
  );
}
