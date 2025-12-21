"use client";

const CONSENT_KEY = "pagesandpeace_cookie_consent";

export const getCookieConsent = (): "accept" | "decline" | null => {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "true") return "accept";
  if (value === "false") return "decline";
  return null;
};

export const hasConsented = (): boolean => getCookieConsent() === "accept";

export const setConsent = (value: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, value ? "true" : "false");
  window.dispatchEvent(new Event("cookieConsentChanged"));
};
