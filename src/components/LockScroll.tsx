// components/LockScroll.tsx
"use client";
import { useEffect } from "react";

export default function LockScroll({ when = true }: { when?: boolean }) {
  useEffect(() => {
    if (!when) return;
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    const prevTouch = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.height = "100svh";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.height = prevHeight;
      document.body.style.touchAction = prevTouch;
    };
  }, [when]);

  return null;
}
