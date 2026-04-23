export default function Loading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-10">
      <div className="bg-white shadow-sm border border-accent/10 rounded-2xl max-w-xl w-full p-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-[#1E3D34]" />
        <h2 className="mt-4 text-xl font-semibold">Loading your booking...</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Please wait while we prepare your confirmation.
        </p>
      </div>
    </main>
  );
}