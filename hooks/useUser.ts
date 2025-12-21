"use client";

import { useEffect, useState, useCallback } from "react";

export type UserSession = {
  id: string | null;
  email?: string;
  name?: string;
  image?: string | null;
  role?: string;
};

export function useUser() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------
  // REFRESH USER MANUALLY
  // ------------------------------------------------------
  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();

      if (data?.id) {
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          image: data.image,
          role: data.role,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("❌ Failed refreshing user:", err);
      setUser(null);
    }

    setLoading(false);
  }, []);

  // ------------------------------------------------------
  // LOAD USER ON MOUNT
  // ------------------------------------------------------
  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  // ------------------------------------------------------
  // LISTEN TO GLOBAL REFRESH EVENTS
  // ------------------------------------------------------
  useEffect(() => {
    const handler = () => queueMicrotask(refresh);

    window.addEventListener("pp:auth-updated", handler);
    window.addEventListener("avatar-updated", handler);
    window.addEventListener("pp:user-should-refresh", handler);

    return () => {
      window.removeEventListener("pp:auth-updated", handler);
      window.removeEventListener("avatar-updated", handler);
      window.removeEventListener("pp:user-should-refresh", handler);
    };
  }, [refresh]);

  return { user, loading, refresh };
}
