// src/app/layout.tsx
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
      {/* ✅ Body is the only scroll container */}
      <body className="min-h-screen flex flex-col ...">
  <UserProvider>
    <CartProvider>
      <div className="flex-1">{children}</div>  {/* no overflow here */}
      <Footer />
      <CookieBanner />
      <ConditionalScripts />
    </CartProvider>
  </UserProvider>
</body>
    </html>
  );
}
