import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[var(--background)] text-[var(--foreground)]">
      {/* LEFT SECTION — Brand Message (Black Background) */}
      <section className="hidden lg:flex flex-col justify-between bg-[#111111] text-[#FAF6F1] p-12">
        {/* ✅ Green logo for contrast on black background */}
        <div>
          <Image
            src="/p&p_logo_cream_transparent.svg"
            alt="Pages & Peace logo cream"
            width={150}
            height={150}
            priority
          />
        </div>

        {/* ✅ Text contrasting with the right panel */}
        <div className="space-y-5">
          <h2 className="text-3xl font-semibold tracking-wide text-[#FAF6F1]">
            Every community needs a chapter 📚
          </h2>
          <p className="text-[#eae6e1] text-base leading-relaxed max-w-md">
            Sign in to continue your story ☕
          </p>
        </div>

        <p className="text-sm text-[#d8d3cd] mt-8">
          © {new Date().getFullYear()} Pages & Peace. All rights reserved.
        </p>
      </section>

      {/* RIGHT SECTION — Form (Cream Background) */}
      <section className="flex items-center justify-center p-8 sm:p-12 bg-[#FAF6F1] text-[#111111]">
        <div className="w-full max-w-md">
          {/* ✅ Logo removed — just form content */}
          {children}
        </div>
      </section>
    </main>
  );
}
