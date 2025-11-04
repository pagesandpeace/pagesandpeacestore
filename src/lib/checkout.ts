export async function handleBuyNow(product: {
  name: string;
  price: number;
  quantity?: number;
}) {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            name: product.name,
            price: product.price,
            quantity: product.quantity ?? 1,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Checkout failed");

    if (data.url) {
      window.location.href = data.url; // ✅ Redirect to Stripe Checkout
    } else {
      alert("No checkout URL returned.");
    }
  } catch (err) {
    console.error("❌ Checkout error:", err);
    alert("Something went wrong with checkout.");
  }
}
