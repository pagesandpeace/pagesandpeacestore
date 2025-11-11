"use client";
import { Button } from "@/components/ui/Button";

export default function LoyaltyBanner({
  bannerText,
  isJoined,
  onJoinClick,
}: {
  bannerText: string;
  isJoined: boolean;
  onJoinClick: () => void;
}) {
  return (
    <div className="bg-[var(--accent)] text-[var(--background)] text-center py-1 px-4 font-semibold text-sm w-full">
      <span>{bannerText}</span>
      {!isJoined && (
        <Button variant="primary" onClick={onJoinClick} className="ml-3">
          Join Now
        </Button>
      )}
    </div>
  );
}
