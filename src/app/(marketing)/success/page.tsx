export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-center p-6">
      <h1 className="text-4xl font-bold text-[var(--accent)] mb-4">
        Payment Successful 🎉
      </h1>
      <p className="text-lg text-[color:var(--foreground)]/70 max-w-md mb-8">
        Thank you for your purchase! Your order has been received and is being processed.
        A confirmation email has been sent to your inbox.
      </p>
      <a
        href="/shop"
        className="btn-primary inline-block"
      >
        Back to Shop
      </a>
    </main>
  );
}
