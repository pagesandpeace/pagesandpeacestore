import Link from "next/link";
import { Button } from "@/components/ui/Button";
import ClearCart from "./ClearCart";

export default function SuccessPage() {
  return (
    <>
      {/* Clears cart after successful checkout */}
      <ClearCart />

      <main className="min-h-screen flex items-center justify-center bg-[#FAF6F1] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          
          {/* Brand */}
          <p className="text-xs uppercase tracking-wide opacity-60 mb-2">
            Pages & Peace
          </p>

          {/* Heading */}
          <h1 className="text-2xl font-semibold mb-3">
            Payment successful
          </h1>

          {/* Message */}
          <p className="text-sm opacity-80 mb-6">
            Thank you for your purchase. Your order has been confirmed and is now
            available in your account.
          </p>

          {/* Primary action */}
          <Link href="/dashboard/orders">
            <Button variant="primary" size="md" className="w-full mb-3">
              View my orders
            </Button>
          </Link>

          {/* Secondary action */}
          <Link href="/shop">
            <Button variant="neutral" size="md" className="w-full">
              Continue shopping
            </Button>
          </Link>

          {/* Reassurance */}
          <p className="mt-6 text-xs opacity-60">
            You’ll also receive a confirmation email shortly.
          </p>
        </div>
      </main>
    </>
  );
}
