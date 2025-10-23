import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#FAF6F1] text-[#111]">
      {/* Left section – brand message */}
      <section className="hidden lg:flex flex-col justify-between bg-[#111] text-[#FAF6F1] p-12">
        <div>
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={60}
            height={60}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-wide">Welcome Back ☕</h2>
          <p className="text-[#eae6e1] text-base leading-relaxed max-w-md">
            Books, coffee, and calm — sign in or join the Pages & Peace community today.
          </p>
        </div>

        <p className="text-sm text-[#d8d3cd] mt-8">
          © {new Date().getFullYear()} Pages & Peace. All rights reserved.
        </p>
      </section>

      {/* Right section – forms */}
      <section className="flex items-center justify-center p-8 sm:p-12 bg-[#FAF6F1]">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
