import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

import { UserProvider } from "@/context/UserContext";
import { CartProvider } from "@/context/CartContext";

import CookieBanner from "@/components/CookieBanner";
import ConditionalScripts from "@/components/ConditionalScripts";
import Footer from "@/components/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Pages & Peace",
  description: "Books, coffee & calm ☕📚",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${montserrat.variable} h-full grid grid-rows-[1fr_auto] antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <UserProvider>
          <CartProvider>
            {/* ✅ Content fills screen height but scrolls only if needed */}
            <div className="min-h-0 overflow-y-auto">
              {children}
            </div>

            {/* ✅ Sticky footer (always visible at bottom of viewport) */}
            <Footer />

            {/* ✅ Global cookie controls */}
            <CookieBanner />
            <ConditionalScripts />
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
