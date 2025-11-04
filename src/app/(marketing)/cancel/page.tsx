export default function CancelPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-center p-6">
      <h1 className="text-4xl font-bold text-red-500 mb-4">Payment Cancelled ❌</h1>
      <p className="text-lg text-[color:var(--foreground)]/70 max-w-md mb-8">
        Your payment was not completed. You can try again or continue browsing our shop.
      </p>
      <a
        href="/shop"
        className="btn-outline inline-block"
      >
        Return to Shop
      </a>
    </main>
  );
}
