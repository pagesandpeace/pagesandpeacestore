"use client";

import { useEffect } from "react";

export default function AuthRefresh() {
  useEffect(() => {
    fetch("/api/me", { cache: "no-store", credentials: "include" })
      .then(() => {
        const evt = new CustomEvent("pp:auth-updated");
        window.dispatchEvent(evt);
      })
      .catch(() => {});
  }, []);

  return null;
}
