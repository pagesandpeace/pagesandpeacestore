"use client";

import * as React from "react";

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-[var(--muted)] text-[var(--accent)] focus:ring-[var(--accent)]"
      />
      <span className="text-sm text-[var(--foreground)]">{label}</span>
    </label>
  );
}
