// src/components/LoyaltyBadge.tsx
"use client";

export default function LoyaltyBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold
                  text-[#1a6b2a] bg-[#E5F7E4] border border-[#cdeed0] ${className}`}
      title="Pages & Peace Loyalty Club"
    >
      <span aria-hidden>🌿</span> Loyalty Member
    </span>
  );
}
