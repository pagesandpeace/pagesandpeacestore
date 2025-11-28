"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

export default function CartClearOnSuccess() {
  const { clearCart } = useCart();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    clearCart();
    console.log("🧹 Cart cleared after successful checkout");
  }, []);  // runs once only

  return null;
}
