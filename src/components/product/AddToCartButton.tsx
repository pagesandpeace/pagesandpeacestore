"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";
import QuantitySelector from "./QuantitySelector";

export default function AddToCartButton({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    imageUrl: string;
    inventory_count?: number; // IMPORTANT: include stock!
  };
}) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const stock = product.inventory_count ?? 0;

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const me = await res.json();
        setLoggedIn(Boolean(me?.id));
      } catch {
        setLoggedIn(false);
      }
    }
    check();
  }, []);

  function handleAdd() {
    if (stock <= 0) {
      alert("Sorry — this item is out of stock.");
      return;
    }

    if (qty > stock) {
      alert(`Only ${stock} left — please reduce quantity.`);
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
      quantity: qty,
      inventory_count: stock,
    });
  }

  return (
    <>
      <QuantitySelector
        qty={qty}
        setQty={(val) => {
          if (val <= stock) setQty(val);
        }}
        max={stock}
      />

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
