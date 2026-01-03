"use client";

import { useCart } from "@/context/CartContext";
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
    fulfilment_mode: "physical" | "made_to_order";
  };
  qty?: number;
}) {
  const { addToCart } = useCart();

  const stock = product.inventory_count ?? 0;
  const quantity = qty ?? 1;
  const isPhysical = product.fulfilment_mode === "physical";

  function handleAdd() {
    // ❌ Only block PHYSICAL items
    if (isPhysical && stock <= 0) {
      alert("Sorry — this item is out of stock.");
      return;
    }

    if (isPhysical && quantity > stock) {
      alert(`Only ${stock} left.`);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity,
      inventory_count: stock,
      fulfilment_mode: product.fulfilment_mode,
    });
  }

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      onClick={handleAdd}
      disabled={isPhysical && stock <= 0}
    >
      {isPhysical && stock <= 0 ? "Out of Stock" : "Add to Basket"}
    </Button>
  );
}
