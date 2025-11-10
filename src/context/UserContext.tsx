"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/actions";

type User = { id: string; name?: string; email: string; image?: string | null } | null;
type UserContextType = { user: User; setUser: (u: User) => void; refreshUser: () => Promise<void> };

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);

  const refreshUser = async () => {
    console.log("🔄 [UserProvider] refreshUser() called");
    try {
      const u = await getCurrentUser();
      console.log("✅ [UserProvider] fetched user:", u);
      setUser(u);
    } catch (err) {
      console.error("❌ [UserProvider] refreshUser() failed:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    console.log("🚀 [UserProvider] mounted – fetching initial user");
    refreshUser();
  }, []);

  // Listen for avatar updates (same-tab + cross-tab)
  useEffect(() => {
    const handleAvatarUpdated = (e: Event) => {
      const custom = e as CustomEvent<string>;
      console.log("🎯 [UserProvider] avatar-updated event fired:", custom.detail);

      setUser((prev) => {
        const updated = prev ? { ...prev, image: custom.detail ?? prev.image } : prev;
        console.log("🧩 [UserProvider] updated user state:", updated);
        return updated;
      });
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "userAvatarUpdated") {
        console.log("🌐 [UserProvider] cross-tab update – calling refreshUser()");
        refreshUser();
      }
    };

    window.addEventListener("avatar-updated", handleAvatarUpdated);
    window.addEventListener("storage", handleStorage);
    console.log("📡 [UserProvider] listeners attached");

    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
      window.removeEventListener("storage", handleStorage);
      console.log("🧹 [UserProvider] listeners removed");
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}