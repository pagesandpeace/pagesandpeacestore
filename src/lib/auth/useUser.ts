"use client";

import { useEffect, useState } from "react";

export type MeResponse = {
  id: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  loyaltyprogram?: boolean | null;
};

export function useUser() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

          // ensures consistent logout state
        if (!res.ok) {
          if (active) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const data: MeResponse = await res.json();

        if (active) {
          setUser(data?.id ? data : null);
          setLoading(false);
        }
      } catch {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    load();

    return () => { active = false };
  }, []);

  return { user, loading, reload: () => window.dispatchEvent(new Event("pp:user-reload")) };
}
