"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Option = {
  id: string;
  name: string;
};

type Suggestion = {
  value: string;
  reason: string;
};

type Props = {
  productId: string;

  genres: Option[];
  vibes: Option[];
  themes: Option[];

  genreId: string | null;
  vibeId: string | null;
  themeId: string | null;

  onSelect: (
    type: "genre" | "vibe" | "theme",
    id: string
  ) => void;

  onCreated: (
    type: "genre" | "vibe" | "theme",
    option: Option
  ) => void;
};

export default function ClassificationSuggestions({
  productId,
  genres,
  vibes,
  themes,
  genreId,
  vibeId,
  themeId,
  onSelect,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<{
    genre?: Suggestion;
    vibe?: Suggestion;
    theme?: Suggestion;
  } | null>(null);

  /* -------------------------------
     LOAD AI SUGGESTIONS
  -------------------------------- */
  async function loadSuggestions() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/products/${productId}/suggest-classification`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "AI failed");
      }

      setSuggestions(json);
    } catch (err) {
      setError("Failed to generate classification suggestions.");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------
     APPLY / CREATE VIA API
  -------------------------------- */
  async function applySuggestion(
    type: "genre" | "vibe" | "theme",
    value: string
  ) {
    setError(null);

    const list =
      type === "genre"
        ? genres
        : type === "vibe"
        ? vibes
        : themes;

    const normalized = value.trim().toLowerCase();

    // ✅ exact match only (DB is canonical)
    const existing = list.find(
      (i) => i.name.trim().toLowerCase() === normalized
    );

    if (existing) {
      onSelect(type, existing.id);
      return;
    }

    const confirmCreate = confirm(
      `"${value}" does not exist.\n\nCreate new ${type}?`
    );

    if (!confirmCreate) return;

    try {
      const res = await fetch(
        "/api/admin/classifications/create",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            name: value,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Create failed");
      }

      const created = json as Option;

      onCreated(type, created);
      onSelect(type, created.id);
    } catch (err) {
      setError(`Failed to create ${type}.`);
    }
  }

  return (
    <div className="rounded border p-4 bg-neutral-50 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">
          AI Classification Suggestions
        </h3>

        <Button
          size="sm"
          variant="neutral"
          onClick={loadSuggestions}
          disabled={loading}
        >
          {loading ? "Analysing…" : "Suggest with AI"}
        </Button>
      </div>

      {error && <Alert type="error" message={error} />}

      {suggestions &&
        (["genre", "vibe", "theme"] as const).map((key) => {
          const s = suggestions[key];
          if (!s) return null;

          return (
            <div key={key} className="text-sm space-y-1">
              <div className="flex justify-between items-center">
                <strong className="capitalize">{key}</strong>

                <Button
                  size="sm"
                  onClick={() => applySuggestion(key, s.value)}
                >
                  Use / Create
                </Button>
              </div>

              <p className="text-xs">{s.value}</p>
              <p className="text-xs text-neutral-600">{s.reason}</p>
            </div>
          );
        })}

      <div className="text-xs text-neutral-600 pt-2 border-t">
        <p>Selected genre: {genreId || "—"}</p>
        <p>Selected vibe: {vibeId || "—"}</p>
        <p>Selected theme: {themeId || "—"}</p>
      </div>
    </div>
  );
}
