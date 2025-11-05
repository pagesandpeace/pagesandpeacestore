"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasConsented } from "@/lib/cookies/manageCookies";

export default function ConditionalScripts() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    if (hasConsented()) {
      setConsentGiven(true);
    }

    // Listen for consent change events from the banner
    const handler = () => {
      if (hasConsented()) setConsentGiven(true);
    };
    window.addEventListener("cookieConsentChanged", handler);
    return () => window.removeEventListener("cookieConsentChanged", handler);
  }, []);

  if (!consentGiven) return null;

  return (
    <>
      {/* ✅ Example: Google Analytics */}
      <Script
        id="ga-script"
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXX');
        `}
      </Script>

      {/* ✅ You can add any other approved scripts here, like Meta Pixel */}
    </>
  );
}
