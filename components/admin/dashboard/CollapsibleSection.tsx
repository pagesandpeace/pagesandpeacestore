"use client";

import { useState } from "react";

export default function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
const [open, setOpen] = useState(true);

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-accent text-white rounded-lg font-semibold"
      >
        {open ? `Hide ${title}` : `Show ${title}`}
      </button>

      {open && (
        <div className="mt-6 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}
