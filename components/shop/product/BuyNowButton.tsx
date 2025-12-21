"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";
import { usePathname } from "next/navigation";

type ProductForBuyNow = {
  id: string;
  slug: string;
  name: string;
  price: number; // pounds
  imageUrl: string;
  inventory_count?: number;
};

interface BuyNowProps {
  product: ProductForBuyNow;
  qty?: number;
}

export default function BuyNowButton({ product, qty }: BuyNowProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  const pathname = usePathname();

  const stock = product.inventory_count ?? 0;
  const quantity = qty ?? 1;

  /* ---------------------------------------------------------
     AUTH UPDATE LISTENER
  --------------------------------------------------------- */
  useEffect(() => {
    function refresh() {
      fetch("/api/me", {
        cache: "no-store",
        credentials: "include",
      }).catch(() => {});
    }

    window.addEventListener("pp:auth-updated", refresh);
    return () => window.removeEventListener("pp:auth-updated", refresh);
  }, []);

  /* ---------------------------------------------------------
     BUY NOW HANDLER
  --------------------------------------------------------- */
  async function handleBuyNow() {
    if (stock <= 0) {
      alert("Sorry — this item is currently out of stock.");
      return;
    }

    if (quantity > stock) {
      alert(`Only ${stock} available.`);
      return;
    }

    setLoading(true);

    // 1. CHECK AUTH
    const res = await fetch("/api/me", {
      cache: "no-store",
      credentials: "include",
    });
    const me = await res.json();

    if (!me?.id) {
      setShowAuth(true);
      setLoading(false);
      return;
    }

    // 2. SEND TO YOUR PRODUCT CHECKOUT ROUTE
    const checkoutRes = await fetch("/api/products/start-checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        name: product.name,
        quantity, // ✔ FIXED (was qty)
        price: product.price,
        imageUrl: product.imageUrl || null,
      }),
    });

    const data = await checkoutRes.json();

    if (!checkoutRes.ok || !data.url) {
      console.error("❌ Checkout error:", data);
      alert("Something went wrong starting checkout.");
      setLoading(false);
      return;
    }

    // 3. REDIRECT TO STRIPE CHECKOUT
    window.location.href = data.url;
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleBuyNow}
        disabled={loading || stock <= 0}
      >
        {stock <= 0 ? "Out of Stock" : loading ? "Processing…" : "Buy Now"}
      </Button>

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        title="Sign in required"
        message="You need an account to buy this item."
        callbackURL={pathname}
      />
    </>
  );
}
