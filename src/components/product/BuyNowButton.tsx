"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";

export default function BuyNowButton({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    imageUrl: string;
  };
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  // Re-check login status when auth updates,
  // but we don't store the value — Buy Now always checks fresh.
  useEffect(() => {
    function recheck() {
      fetch("/api/me", { cache: "no-store" }).catch(() => {});
    }

    window.addEventListener("pp:auth-updated", recheck);
    return () => window.removeEventListener("pp:auth-updated", recheck);
  }, []);

  async function handleBuyNow() {
    setLoading(true);

    // Always verify login at click time
    const res = await fetch("/api/me", { cache: "no-store" });
    const me = await res.json();

    if (!me?.id) {
      setShowAuth(true);
      setLoading(false);
      return;
    }

    // Logged in → begin checkout
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
            quantity: 1,
            imageUrl: product.imageUrl,
          },
        ],
      }),
    });

    const data = await checkoutRes.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout failed.");
    }

    setLoading(false);
  }

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleBuyNow}
        disabled={loading}
      >
        {loading ? "Processing…" : "Buy Now"}
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
