"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthRefresh() {
  const supabase = supabaseBrowser();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Notify app ONLY when auth state truly changes
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        window.dispatchEvent(new CustomEvent("pp:auth-updated"));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
