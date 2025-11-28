"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";

export default function BuyNowButton({
  product,
  qty,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    imageUrl: string;
    inventory_count?: number;
  };
  qty?: number; // ✅ made optional
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  const stock = product.inventory_count ?? 0;
  const quantity = qty ?? 1; // ✅ fallback to 1

  useEffect(() => {
    function recheck() {
      fetch("/api/me", { cache: "no-store" }).catch(() => {});
    }
    window.addEventListener("pp:auth-updated", recheck);
    return () => window.removeEventListener("pp:auth-updated", recheck);
  }, []);

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

    const res = await fetch("/api/me", { cache: "no-store" });
    const me = await res.json();

    if (!me?.id) {
      setShowAuth(true);
      setLoading(false);
      return;
    }

    const checkoutRes = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,          // ✅ uses fallback
            imageUrl: product.imageUrl,
          },
        ],
      }),
    });

    const data = await checkoutRes.json();

    if (data.url) window.location.href = data.url;
    else alert("Checkout failed.");

    setLoading(false);
  }

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
        callbackURL={`/product/${product.slug}`}
      />
    </>
  );
}
