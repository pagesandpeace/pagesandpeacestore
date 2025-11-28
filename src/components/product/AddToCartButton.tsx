"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";

export default function AddToCartButton({
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
  const { addToCart } = useCart();
  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const stock = product.inventory_count ?? 0;
  const quantity = qty ?? 1; // ✅ fallback to 1

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((me) => setLoggedIn(Boolean(me?.id)))
      .catch(() => setLoggedIn(false));
  }, []);

  function handleAdd() {
    if (stock <= 0) {
      alert("Sorry — this item is out of stock.");
      return;
    }

    if (quantity > stock) {
      alert(`Only ${stock} left.`);
      return;
    }

    if (!loggedIn) {
      setShowAuth(true);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity,
      inventory_count: stock,
    });
  }

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleAdd}
        disabled={stock <= 0}
      >
        {stock <= 0 ? "Out of Stock" : "Add to Basket"}
      </Button>

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        title="Sign in required"
        message="You need an account to add items to your basket."
        callbackURL={`/product/${product.slug}`}
      />
    </>
  );
}
