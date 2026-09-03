"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthRefresh() {
  const supabase = supabaseBrowser();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem("cart");
        window.localStorage.removeItem("app_core_event_basket_v1");
        window.dispatchEvent(new CustomEvent("pp:cart-cleared"));
        window.dispatchEvent(new Event("app-core-basket-changed"));
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.dispatchEvent(new CustomEvent("pp:auth-updated"));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
