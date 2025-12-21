"use client";

import { useEffect, useState } from "react";

export interface UserProfile {
  id: string | null;
  email?: string;
  name?: string;
  image?: string | null;
  role?: string;
  auth_provider?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();

        if (!mounted) return;

        if (data?.id) setUser(data);
        else setUser(null);

        setLoading(false);
      } catch (err) {
        console.error("❌ useUser failed:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
