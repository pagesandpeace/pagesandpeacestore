import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/context/CartContext"; // safe
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/Toaster";
import AuthRefresh from "@/components/AuthRefresh"; // ⭐ NEW

export const metadata: Metadata = {
  title: "Pages & Peace",
  description: "Books, coffee & calm ☕📚",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// ⭐ Required viewport export for Next.js 16+
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${montserrat.variable} min-h-screen flex flex-col antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <Toaster />
        <AuthRefresh /> {/* ⭐ client-side auth sync */}

        <CartProvider>
          <div className="flex-1 min-h-0">{children}</div>

          <Footer />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  );
}
