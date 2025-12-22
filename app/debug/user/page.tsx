// app/debug/user/page.tsx
"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function UserDebug() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user);
      });
  }, []);

  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(user, null, 2)}
    </pre>
  );
}
