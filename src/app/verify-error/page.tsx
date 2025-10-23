export default function VerifyErrorPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat,Arial,sans-serif]">
      <div className="bg-white shadow-md rounded-2xl p-8 text-center max-w-md">
        <h1 className="text-2xl font-semibold mb-4">⚠️ Verification Failed</h1>
        <p className="text-gray-700 mb-6">
          The verification link is invalid or has expired. Please try signing up
          again or request a new verification email.
        </p>
        <a
          href="/sign-in"
          className="inline-block bg-[#5DA865] text-white px-6 py-3 rounded-lg hover:bg-[#4b8a55] transition"
        >
          Return to Sign In
        </a>
      </div>
    </main>
  );
}
