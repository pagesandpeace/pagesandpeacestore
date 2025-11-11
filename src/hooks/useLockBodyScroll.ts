// src/hooks/useLockBodyScroll.ts
"use client";

import { useEffect } from "react";

export function useLockBodyScroll() {
  useEffect(() => {
    const html = document.documentElement; // safer than body for iOS
    const prevOverflow = html.style.overflow;
    const prevOverscroll = html.style.overscrollBehavior;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain"; // prevents rubber-band without breaking layout

    return () => {
      html.style.overflow = prevOverflow;
      html.style.overscrollBehavior = prevOverscroll;
    };
  }, []);
}
