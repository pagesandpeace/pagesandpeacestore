import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

import { UserProvider } from "@/context/UserContext";
import { CartProvider } from "@/context/CartContext";
import CookieBanner from "@/components/CookieBanner";
import ConditionalScripts from "@/components/ConditionalScripts";
import Footer from "@/components/Footer";

import { Toaster } from "@/components/ui/Toaster";  // ⭐ ADD THIS

export const metadata: Metadata = {
  title: "Pages & Peace",
  description: "Books, coffee & calm ☕📚",
  other: { "viewport": "width=device-width, initial-scale=1, viewport-fit=cover" },
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${montserrat.variable} min-h-screen flex flex-col antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        {/* ⭐ Toasts work globally */}
        <Toaster />

        <UserProvider>
          <CartProvider>
            <div className="flex-1 min-h-0">
              {children}
            </div>

            <Footer />
            <CookieBanner />
            <ConditionalScripts />
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
