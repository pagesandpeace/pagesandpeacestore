"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { hasConsented, setConsent } from "@/lib/cookies/manageCookies";
import { motion, AnimatePresence } from "framer-motion";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Avoid synchronous setState inside effect
    Promise.resolve().then(() => {
      if (!hasConsented()) {
        setVisible(true);
      }
    });
  }, []);

  const handleAccept = () => {
    setConsent(true);
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent(false);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] md:w-[70%] lg:w-[50%]
                     bg-[#111] text-[#FAF6F1] rounded-2xl shadow-lg border border-[#333]
                     p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 font-[Montserrat]"
        >
          <p className="text-sm text-center sm:text-left leading-relaxed">
            We use cookies to enhance your browsing experience and measure site performance.
            See our{" "}
            <Link href="/cookies" className="underline text-accent">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline text-accent">
              Privacy Policy
            </Link>.
          </p>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleAccept}
              className="bg-[#5DA865] text-[#FAF6F1] rounded-full px-4 py-2 font-semibold 
                         hover:bg-[#4e9156] transition duration-200"
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              className="border border-[#FAF6F1]/80 text-[#FAF6F1] rounded-full px-4 py-2 font-semibold 
                         hover:bg-[#222] transition duration-200"
            >
              Decline
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
