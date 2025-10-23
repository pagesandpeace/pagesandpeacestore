import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] flex flex-col items-center justify-between px-6 py-16 text-center">
      {/* --- Logo Section --- */}
      <section className="flex flex-col items-center mt-10">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={140}
          height={140}
          className="mb-6"
        />
        <h1 className="font-montserrat text-4xl sm:text-6xl tracking-widest text-[#111111]">
          PAGES & PEACE
        </h1>
        <p className="mt-4 text-[#111111]/80 text-lg max-w-md leading-relaxed">
          ☕ Every community needs a chapter.
        </p>
      </section>

      {/* --- Call-to-Action Buttons --- */}
      <section className="flex flex-col sm:flex-row gap-4 mt-10">
        <Link
          href="/shop"
          className="px-8 py-3 bg-[#5DA865] text-[#FAF6F1] rounded-full font-semibold text-lg hover:bg-[#4e9156] transition-all shadow-sm"
        >
          🛍️ Browse the Shop
        </Link>
        <Link
          href="/book-club"
          className="px-8 py-3 border-2 border-[#5DA865] text-[#111111] rounded-full font-semibold text-lg hover:bg-[#5DA865]/10 transition-all"
        >
          📚 Join the Book Club
        </Link>
      </section>

      {/* --- Auth Links --- */}
      <section className="mt-20">
        <p className="text-[#111111]/70 mb-3">Ready to make it personal?</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="text-[#5DA865] font-semibold hover:underline"
          >
            Sign In
          </Link>
          <span className="text-[#5DA865]/50">|</span>
          <Link
            href="/sign-up"
            className="text-[#5DA865] font-semibold hover:underline"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="mt-24 text-sm text-[#111111]/60">
        © {new Date().getFullYear()}{" "}
        <span className="text-[#111] font-medium">Pages & Peace</span> · Crafted
        with ☕ & 📚
      </footer>
    </main>
  );
}
