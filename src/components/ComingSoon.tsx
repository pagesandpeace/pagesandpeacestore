"use client";

import Link from "next/link";

type Action = { label: string; href: string };

export default function ComingSoon({
  title = "Coming Soon",
  description = "This feature isn’t live yet. We’re polishing things and will roll it out shortly.",
  actions = [],
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: Action[];
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#e0dcd6] bg-white p-6 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E5F7E4] px-3 py-1 text-sm font-semibold text-[#2f7f46]">
        <span>In development</span> <span aria-hidden>🛠️</span>
      </div>
      <h2 className="text-2xl font-semibold tracking-wide">{title}</h2>
      <p className="mt-2 text-[var(--foreground)]/80">{description}</p>

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--accent)]
                         px-4 py-2 font-semibold text-[var(--accent)] hover:border-[var(--secondary)]
                         hover:text-[var(--secondary)] transition-colors"
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
