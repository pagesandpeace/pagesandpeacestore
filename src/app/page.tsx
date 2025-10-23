import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center text-center p-8">
      {/* Logo or Hero Image */}
      <div className="mb-6">
        <Image
          src="/p&p_logo_cream.svg" // replace with your real logo later
          alt="Pages & Peace Logo"
          width={140}
          height={140}
          className="rounded-full shadow-md"
        />
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-800 mb-4">
        ☕ Pages & Peace
      </h1>
      <p className="text-lg sm:text-xl text-stone-600 max-w-lg mb-8">
        A book-lover’s coffee nook opening soon in Rossington.
        <br />
        Where stories are shared and calm is served.
      </p>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/sign-up"
          className="bg-stone-800 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-700 transition"
        >
          Join the Book Club
        </Link>
        <Link
          href="/shop"
          className="border border-stone-400 text-stone-800 px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-100 transition"
        >
          Browse Coffee & Books
        </Link>
      </div>

      {/* Footer note */}
      <footer className="mt-12 text-sm text-stone-500">
        <p>
          © {new Date().getFullYear()} Pages & Peace · Crafted with ☕ & 📚
        </p>
        <p className="mt-2">
          <Link
            href="mailto:hello@pagesandpeace.com"
            className="underline hover:text-stone-700"
          >
            Contact Us
          </Link>
        </p>
      </footer>
    </main>
  );
}
