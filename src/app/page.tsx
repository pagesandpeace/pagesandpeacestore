import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-between px-6 py-16 text-center">
      {/* --- Logo Section --- */}
      <section className="flex flex-col items-center mt-10">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={140}
          height={140}
          className="mb-6"
        />
        <h1 className="font-montserrat text-4xl sm:text-6xl tracking-widest text-[var(--foreground)]">
          PAGES & PEACE
        </h1>
        <p className="mt-4 text-[color:var(--foreground)]/80 text-lg max-w-md leading-relaxed">
          ☕ Every community needs a chapter.
        </p>
      </section>

      {/* --- Call-to-Action Buttons --- */}
      <section className="flex flex-col sm:flex-row gap-4 mt-10">
        <Link
          href="/shop"
          className="btn-primary text-lg font-semibold shadow-sm"
        >
          🛍️ Browse the Shop
        </Link>
        <Link
          href="/book-club"
          className="btn-outline text-lg font-semibold"
        >
          📚 Join the Book Club
        </Link>
      </section>

      {/* --- Auth Links --- */}
      <section className="mt-20">
        <p className="text-[color:var(--foreground)]/70 mb-3">
          Ready to make it personal?
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="text-[color:var(--accent)] font-semibold hover:underline"
          >
            Sign In
          </Link>
          <span className="text-[color:var(--accent)]/50">|</span>
          <Link
            href="/sign-up"
            className="text-[color:var(--accent)] font-semibold hover:underline"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="mt-24 text-sm text-[color:var(--foreground)]/60">
        © {new Date().getFullYear()}{" "}
        <span className="text-[color:var(--foreground)] font-medium">
          Pages & Peace
        </span>{" "}
        · Crafted with ☕ & 📚
      </footer>
    </main>
  );
}
