"use client";

import { useEffect, useState, useCallback } from "react";

export type UserSession = {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  role: "admin" | "user";
};

export function useUser() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data?.id && data?.role) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("❌ Failed refreshing user:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();

    window.addEventListener("pp:auth-updated", handler);
    window.addEventListener("pp:user-should-refresh", handler);
    window.addEventListener("avatar-updated", handler);

    return () => {
      window.removeEventListener("pp:auth-updated", handler);
      window.removeEventListener("pp:user-should-refresh", handler);
      window.removeEventListener("avatar-updated", handler);
    };
  }, [refresh]);

  return { user, loading, refresh };
}
