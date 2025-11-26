"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Your cart is empty.");

    try {
      const items = cart.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      }));

      const res = await fetch("/api/checkout", {
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
    } catch (err) {
      console.error("❌ Checkout Error:", err);
      alert("Something went wrong during checkout.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16 font-[Montserrat]">
      <h1 className="text-3xl font-bold text-center text-[var(--foreground)] mb-10">
        Your Basket
      </h1>

      {/* EMPTY CART */}
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
        /* CART HAS ITEMS */
        <div className="max-w-4xl mx-auto space-y-10">

          {/* CART ITEMS */}
          <ul className="space-y-6">
            {cart.map((item) => (
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
                    <p className="font-medium text-[var(--foreground)]">
                      {item.name}
                    </p>
                    <p className="text-sm text-[var(--foreground)]/60">
                      £{item.price.toFixed(2)}
                    </p>

                    {/* QUANTITY CONTROLS */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="px-3 py-1 rounded-full border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10"
                      >
                        –
                      </button>

                      <span className="text-lg font-medium w-8 text-center">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="px-3 py-1 rounded-full border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10"
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

                <p className="text-[var(--accent)] font-semibold">
                  £{(item.price * item.quantity).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>

          {/* DELIVERY METHOD */}
          <div className="border border-[var(--accent)]/20 rounded-lg p-4 bg-white">
            <h3 className="font-semibold text-[var(--foreground)] mb-3">
              Delivery Method
            </h3>

            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={true}
                readOnly
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--foreground)]">
                Pick up in store — Pages & Peace Bookshop
              </span>
            </label>

            <p className="text-xs text-neutral-600 mt-2">
              Delivery options coming soon.
            </p>
          </div>

          {/* TOTAL */}
          <div className="flex items-center justify-between text-lg font-semibold text-[var(--foreground)] pt-4">
            <p>Total:</p>
            <p>£{total.toFixed(2)}</p>
          </div>

          {/* CHECKOUT + CLEAR */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleCheckout}
            >
              Checkout
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
    </main>
  );
}
