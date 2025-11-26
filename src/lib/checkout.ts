"use client";

export async function handleBuyNow(product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  imageUrl?: string;
}) {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: product.quantity ?? 1,
            imageUrl: product.imageUrl ?? null,
          },
        ],
      }),
    });

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  } catch (_err) {
    // underscore prevents ESLint warning
    alert("Checkout failed.");
    console.error("Checkout failed:", _err);
  }
}
