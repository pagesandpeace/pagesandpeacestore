import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Pages & Peace",
  description: "Books, coffee & calm ☕📚",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        {/* ✅ Wrap entire app */}
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
