// src/hooks/useShowOnce.ts
"use client";

import { useEffect, useState } from "react";

export function useShowOnce(key: string, ttlHours = 24) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setVisible(true);
        return;
      }
      const { ts } = JSON.parse(raw) as { ts: number };
      const ageMs = Date.now() - ts;
      if (ageMs > ttlHours * 3600 * 1000) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [key, ttlHours]);

  const dismiss = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now() }));
    } catch {}
    setVisible(false);
  };

  return { visible, dismiss };
}
