"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   CART ITEM TYPE — FIXED & EXTENDED
========================================================= */

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;

  // 🔥 Supports blind-date metadata
  metadata?: {
    genreSelected?: string;
    colour?: string;
    difficulty?: string;
    trinkets?: string[];
  };
};

/* =========================================================
   CONTEXT TYPE
========================================================= */

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: number;
  totalQty: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load from storage
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("cart")
          : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to read cart:", err);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cart", JSON.stringify(cart));
      }
    } catch (err) {
      console.warn("⚠️ Failed to write cart:", err);
    }
  }, [cart]);

  /* -----------------------------
     ADD TO CART
  ----------------------------- */
  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);

      if (existing) {
        // Merge metadata if blind-date
        return prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                quantity: p.quantity + item.quantity,
                metadata: item.metadata ?? p.metadata,
              }
            : p
        );
      }

      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: quantity < 1 ? 1 : quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    try {
      window.localStorage.removeItem("cart");
    } catch {}
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        totalQty,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

/* =========================================================
   HOOK
========================================================= */

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
