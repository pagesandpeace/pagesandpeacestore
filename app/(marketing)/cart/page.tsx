"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  /* ---------------------------
     Load logged-in user
  --------------------------- */
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((me) => setUserId(me?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  /* ---------------------------
     Fetch live stock (physical only)
  --------------------------- */
  useEffect(() => {
    async function fetchStock() {
      try {
        const physicalIds = cart
          .filter((i) => i.fulfilment_mode === "physical")
          .map((i) => i.id);

        if (physicalIds.length === 0) {
          setStockMap({});
          setLoadingStock(false);
          return;
        }

        const res = await fetch("/api/products/stock-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: physicalIds }),
        });

        const data = await res.json();
        setStockMap(data);
      } catch (err) {
        console.error("Stock fetch failed", err);
      } finally {
        setLoadingStock(false);
      }
    }

    fetchStock();
  }, [cart]);

  /* ---------------------------
     Stock issue detection
     Only physical products are checked
  --------------------------- */
  const cartHasStockIssues = cart.some((item) => {
    if (item.fulfilment_mode !== "physical") return false;

    const stock = stockMap[item.id];
    if (stock === undefined) return false;

    return item.quantity > stock;
  });

  /* ---------------------------
     Checkout handler
  --------------------------- */
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Your cart is empty.");
    if (cartHasStockIssues)
      return alert(
        "Some items exceed available stock. Please adjust quantities."
      );

    if (!userId) {
      setShowAuth(true);
      return;
    }

    const items = cart.map((item) => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    }));

    const res = await fetch("/api/cart/start-checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout session could not be created.");
    }
  };

  /* ---------------------------
     UI
  --------------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-16 font-[Montserrat]">
      <h1 className="text-3xl font-bold text-center text-[#111] mb-10">
        Your Basket
      </h1>

      {cart.length === 0 ? (
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <Alert type="info" message="Your cart is currently empty." />

          <Button
            variant="primary"
            size="lg"
            className="mt-2"
            onClick={() => (window.location.href = "/shop")}
          >
            ← Back to Shop
          </Button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10">
          <ul className="space-y-6">
            {cart.map((item) => {
              const stock = stockMap[item.id];
              const isPhysical = item.fulfilment_mode === "physical";

              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#e8e2d9] pb-4"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={item.imageUrl || "/coming_soon.svg"}
                      alt={item.name}
                      width={70}
                      height={70}
                      className="rounded-md shadow-sm"
                    />

                    <div>
                      <p className="font-medium text-[#111]">{item.name}</p>
                      <p className="text-sm text-[#111]/60">
                        £{item.price.toFixed(2)}
                      </p>

                      {!loadingStock && isPhysical && stock !== undefined && (
                        <p className="text-xs mt-1 text-red-600">
                          {stock === 0
                            ? "Out of stock"
                            : `Only ${stock} left`}
                        </p>
                      )}

                      {!isPhysical && (
                        <p className="text-xs mt-1 text-neutral-500">
                          Made to order
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="px-3 py-1 rounded-full border border-[#5DA865]/40 hover:bg-[#5DA865]/10"
                        >
                          –
                        </button>

                        <span className="text-lg font-medium w-8 text-center">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => {
                            if (
                              isPhysical &&
                              stock !== undefined &&
                              item.quantity >= stock
                            )
                              return;

                            updateQuantity(item.id, item.quantity + 1);
                          }}
                          className="px-3 py-1 rounded-full border border-[#5DA865]/40 hover:bg-[#5DA865]/10"
                          disabled={
                            isPhysical &&
                            stock !== undefined &&
                            item.quantity >= stock
                          }
                        >
                          +
                        </button>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-sm text-red-600 underline ml-4"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[#5DA865] font-semibold">
                    £{(item.price * item.quantity).toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleCheckout}
              disabled={cartHasStockIssues}
            >
              {cartHasStockIssues ? "Fix Stock Issues" : "Checkout"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </div>
        </div>
      )}

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        title="Sign in required"
        message="You need an account to proceed to checkout."
        callbackURL="/cart"
      />
    </main>
  );
}
