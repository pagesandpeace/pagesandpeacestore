"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";

export default function ClearCart() {
  const { clearCart, cart } = useCart();
  const hasCleared = useRef(false);

  useEffect(() => {
    // Only clear once, and only if cart has items
    if (!hasCleared.current && cart.length > 0) {
      hasCleared.current = true;
      clearCart();
    }
  }, [cart.length, clearCart]);

  return null;
}
