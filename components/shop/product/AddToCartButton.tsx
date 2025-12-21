"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
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
  qty?: number;
}) {
  const { addToCart } = useCart();
  const [loggedIn, setLoggedIn] = useState(false);

  const stock = product.inventory_count ?? 0;
  const quantity = qty ?? 1;

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

    // ✅ ALWAYS add to cart (no login needed)
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity,
      inventory_count: stock,
    });

    // No modal here — user stays on product page
  }

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      onClick={handleAdd}
      disabled={stock <= 0}
    >
      {stock <= 0 ? "Out of Stock" : "Add to Basket"}
    </Button>
  );
}
