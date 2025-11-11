// src/components/EarlyAccessBanner.tsx
"use client";

import Link from "next/link";
import { useShowOnce } from "@/hooks/useShowOnce";

export default function EarlyAccessBanner({
  isMember,
}: {
  isMember: boolean;
}) {
  // key separates member vs non-member reminders
  const { visible, dismiss } = useShowOnce(
    isMember ? "pp_banner_member" : "pp_banner_nonmember",
    24 // show again after 24h if they dismiss
  );

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-[var(--foreground)]/85">
          {isMember ? (
            <>
              🌿 <strong>Chapters Club</strong> early access — thanks for being
              a founding member. Perks are rolling out soon. We’ll notify you in
              the dashboard as features land.
            </>
          ) : (
            <>
              🌿 <strong>Chapters Club</strong> is opening soon. Earn points on
              books and coffee and unlock member perks. Join as an early
              adopter to help shape it.
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!isMember && (
            <Link
              href="/sign-up?join=loyalty"
              className="
                inline-block px-5 py-2 rounded-full
                text-[var(--accent)] border-2 border-[var(--accent)]
                hover:text-[var(--secondary)] hover:border-[var(--secondary)]
                transition-all text-sm font-semibold
              "
            >
              Join Chapters Club
            </Link>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="
              inline-block px-5 py-2 rounded-full
              text-[var(--accent)] border-2 border-[var(--accent)]
              hover:text-[var(--secondary)] hover:border-[var(--secondary)]
              transition-all text-sm font-semibold
            "
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
