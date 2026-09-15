import type { Metadata, Viewport } from "next";
import { Montserrat, Geist } from "next/font/google";
import "./globals.css";

import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/Toaster";
import AuthRefresh from "@/components/AuthRefresh";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pagesandpeace.co.uk";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["BookStore", "CafeOrCoffeeShop"],
  name: "Pages & Peace",
  url: SITE_URL,
  description: "Independent bookshop, café and community event space in Rossington, Doncaster.",
  email: "admin@pagesandpeace.co.uk",
  telephone: "+447395266100",
  address: {
    "@type": "PostalAddress",
    streetAddress: "8 Eva Building, Kings Avenue",
    addressLocality: "Rossington, Doncaster",
    postalCode: "DN11 0PF",
    addressCountry: "GB",
  },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday"], opens: "09:00", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Thursday", "Friday", "Saturday"], opens: "09:00", closes: "17:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "10:00", closes: "16:00" },
  ],
  sameAs: [
    "https://www.instagram.com/pagesandpeace_cafe/",
    "https://www.facebook.com/profile.php?id=61581624222575",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pages & Peace",
    template: "%s | Pages & Peace",
  },
  description: "Independent bookshop, café and community events in Rossington, Doncaster.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Pages & Peace",
    description: "Independent bookshop, café and community events in Rossington, Doncaster.",
    url: SITE_URL,
    siteName: "Pages & Peace",
    type: "website",
    images: [
      {
        url: "https://res.cloudinary.com/dadinnds6/image/upload/v1763725964/Logo_new_update_in_cream_green_background_y7w8oq.png",
        width: 1200,
        height: 630,
        alt: "Pages & Peace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pages & Peace",
    description: "Independent bookshop, café and community events in Rossington, Doncaster.",
    images: [
      "https://res.cloudinary.com/dadinnds6/image/upload/v1763725964/Logo_new_update_in_cream_green_background_y7w8oq.png",
    ],
  },
};

export const viewport: Viewport = {
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
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body
        className={`${montserrat.variable} min-h-screen flex flex-col antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <script
          id="pages-and-peace-local-business"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c") }}
        />
        <Toaster />
        <AuthRefresh />
        <div className="flex-1 min-h-0">{children}</div>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
