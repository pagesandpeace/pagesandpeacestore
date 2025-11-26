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
  };
}) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

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
    });
  }

  return (
    <>
      <QuantitySelector qty={qty} setQty={setQty} />

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleAdd}
      >
        Add to Basket
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
