"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   CART ITEM TYPE — CLEAN & EXPLICIT
========================================================= */

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;

  // Inventory (only enforced for physical items)
  inventory_count: number;

  // ✅ SINGLE SOURCE OF TRUTH FOR AVAILABILITY
  fulfilment_mode: "physical" | "made_to_order";

  // Blind-date metadata
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

  /* -----------------------------
     LOAD FROM STORAGE
  ----------------------------- */
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("cart")
          : null;

      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          Promise.resolve().then(() => setCart(parsed));
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to read cart:", err);
    }
  }, []);

  useEffect(() => {
    const clearForSignOut = () => setCart([]);
    window.addEventListener("pp:cart-cleared", clearForSignOut);
    return () => window.removeEventListener("pp:cart-cleared", clearForSignOut);
  }, []);

  /* -----------------------------
     SAVE TO STORAGE
  ----------------------------- */
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
     ADD TO CART (FULFILMENT AWARE)
  ----------------------------- */
  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      const isPhysical = item.fulfilment_mode === "physical";

      // Item already in cart
      if (existing) {
        const newQty = existing.quantity + item.quantity;

        if (isPhysical && newQty > existing.inventory_count) {
          alert(`Only ${existing.inventory_count} in stock.`);
          return prev;
        }

        return prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                quantity: newQty,
                metadata: item.metadata ?? p.metadata,
              }
            : p
        );
      }

      // Adding new item
      if (isPhysical && item.quantity > item.inventory_count) {
        alert(`Only ${item.inventory_count} in stock.`);
        return prev;
      }

      return [...prev, item];
    });
  };

  /* -----------------------------
     REMOVE FROM CART
  ----------------------------- */
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  /* -----------------------------
     UPDATE QUANTITY (FULFILMENT AWARE)
  ----------------------------- */
  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isPhysical = item.fulfilment_mode === "physical";

          if (isPhysical && quantity > item.inventory_count) {
            alert(`Only ${item.inventory_count} available.`);
            return item;
          }

          return {
            ...item,
            quantity: quantity < 1 ? 1 : quantity,
          };
        }
        return item;
      })
    );
  };

  /* -----------------------------
     CLEAR CART
  ----------------------------- */
  const clearCart = () => {
    setCart([]);
    try {
      window.localStorage.removeItem("cart");
    } catch {}
  };

  /* -----------------------------
     TOTALS
  ----------------------------- */
  const total = useMemo(
    () =>
      cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
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
