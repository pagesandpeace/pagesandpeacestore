"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUserClient } from "@/lib/auth/client";

type User = { id: string; name?: string; email: string; image?: string | null } | null;

type UserContextType = {
  user: User;
  setUser: (u: User) => void;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);

  const refreshUser = async () => {
    const u = await getCurrentUserClient();
    setUser(u);
  };

  useEffect(() => {
    refreshUser();
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
