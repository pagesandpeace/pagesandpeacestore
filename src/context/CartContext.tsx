"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: number; // £ total
  totalQty: number; // total items badge
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load from localStorage (once, on mount)
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined"
        ? window.localStorage.getItem("cart")
        : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to read cart from localStorage:", err);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cart", JSON.stringify(cart));
      }
    } catch (err) {
      console.warn("⚠️ Failed to write cart to localStorage:", err);
    }
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: p.quantity + item.quantity }
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
        item.id === id ? { ...item, quantity: quantity < 1 ? 1 : quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cart");
      }
    } catch (err) {
      console.warn("⚠️ Failed to clear cart localStorage:", err);
    }
  };

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
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

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
