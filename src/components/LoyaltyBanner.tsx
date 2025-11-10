"use client";

import { Button } from "@/components/ui/Button"; // Importing the Button component

export default function LoyaltyBanner({ bannerText, isJoined, onJoinClick }: { bannerText: string, isJoined: boolean, onJoinClick: () => void }) {
  return (
    <div className="bg-[var(--accent)] text-[var(--background)] text-center py-1 px-4 font-semibold text-sm w-full"> {/* Reduced vertical padding */}
      <span>{bannerText}</span>
      {!isJoined && (
        <Button
          variant="primary" // Ensure the correct variant is passed
          onClick={onJoinClick}
          className="ml-3"
        >
          Join Now
        </Button>
      )}
    </div>
  );
}
