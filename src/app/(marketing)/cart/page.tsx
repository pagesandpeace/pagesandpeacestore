"use client";

import { useCart } from "@/context/CartContext";
// import { handleBuyNow } from "@/lib/checkout"; // ❌ remove this unused import

import Image from "next/image";

export default function CartPage() {
  const { cart, clearCart } = useCart();

  // compute totals
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    console.log("🟢 Cart checkout clicked", cart);
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    try {
      // Convert cart into Stripe-ready items
      const items = cart.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      console.log("📦 Sending items to checkout:", items);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      console.log("💳 Stripe response:", data);

      if (data.url) {
        window.location.href = data.url; // redirect to Stripe
      } else {
        alert("Failed to start checkout session.");
      }
    } catch (err) {
      console.error("❌ Cart checkout error:", err);
      alert("Something went wrong during checkout.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16">
      <h1 className="text-3xl font-bold mb-8 text-center text-[var(--foreground)]">
        Your Basket
      </h1>

      {cart.length === 0 ? (
        <p className="text-center text-gray-600">Your cart is empty.</p>
      ) : (
        <div className="max-w-4xl mx-auto">
          <ul className="space-y-4 mb-8">
            {cart.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-b border-gray-200 pb-3"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={item.imageUrl || "/coming_soon.svg"}
                    alt={item.name}
                    width={60}
                    height={60}
                    className="rounded-md"
                  />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      £{item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-[var(--accent)]">
                  £{(item.price * item.quantity).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-lg font-semibold mb-6">
            <p>Total:</p>
            <p>£{total.toFixed(2)}</p>
          </div>

          <div className="flex gap-4">
            <button onClick={handleCheckout} className="btn-primary flex-1">
              Checkout
            </button>
            <button onClick={clearCart} className="btn-outline flex-1">
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
