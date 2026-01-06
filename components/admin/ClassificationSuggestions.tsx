"use client";

import { useState, useMemo } from "react";
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
     HELPERS
  -------------------------------- */

  function getList(type: "genre" | "vibe" | "theme") {
    return type === "genre"
      ? genres
      : type === "vibe"
      ? vibes
      : themes;
  }

  function resolveName(
    list: Option[],
    id: string | null
  ): string {
    if (!id) return "—";
    const found = list.find((o) => o.id === id);
    return found ? found.name : "—";
  }

  const selectedNames = useMemo(() => {
    return {
      genre: resolveName(genres, genreId),
      vibe: resolveName(vibes, vibeId),
      theme: resolveName(themes, themeId),
    };
  }, [genres, vibes, themes, genreId, vibeId, themeId]);

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
<<<<<<< HEAD
        throw new Error(json.error || "AI failed");
=======
        throw new Error(json.error || "AI request failed");
>>>>>>> staging
      }

      setSuggestions(json);
    } catch (err) {
<<<<<<< HEAD
      setError("Failed to generate classification suggestions.");
=======
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate classification suggestions."
      );
>>>>>>> staging
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

<<<<<<< HEAD
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

=======
    const list = getList(type);
    const normalized = value.toLowerCase().trim();

    const existing = list.find(
      (o) => o.name.toLowerCase().trim() === normalized
    );

    // ✅ Exists → select
>>>>>>> staging
    if (existing) {
      onSelect(type, existing.id);
      return;
    }

<<<<<<< HEAD
=======
    // ❌ Missing → create
>>>>>>> staging
    const confirmCreate = confirm(
      `"${value}" does not exist.\n\nCreate new ${type}?`
    );

    if (!confirmCreate) return;

    const reason = suggestions?.[type]?.reason;
    if (!reason) {
      setError(
        "AI did not provide a description. Cannot create classification."
      );
      return;
    }

    try {
      const res = await fetch(
        "/api/admin/classifications/create",
        {
          method: "POST",
          credentials: "include",
<<<<<<< HEAD
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            name: value,
=======
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: value,
            description: reason,
>>>>>>> staging
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Create failed");
      }

<<<<<<< HEAD
      const created = json as Option;
=======
      const created: Option = json;
>>>>>>> staging

      onCreated(type, created);
      onSelect(type, created.id);
    } catch (err) {
<<<<<<< HEAD
      setError(`Failed to create ${type}.`);
=======
      setError(
        err instanceof Error
          ? err.message
          : `Failed to create ${type}.`
      );
>>>>>>> staging
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

<<<<<<< HEAD
      <div className="text-xs text-neutral-600 pt-2 border-t">
        <p>Selected genre: {genreId || "—"}</p>
        <p>Selected vibe: {vibeId || "—"}</p>
        <p>Selected theme: {themeId || "—"}</p>
=======
      {/* READ-ONLY FEEDBACK */}
      <div className="text-xs text-neutral-600 pt-2 border-t space-y-1">
        <p>Selected genre: {selectedNames.genre}</p>
        <p>Selected vibe: {selectedNames.vibe}</p>
        <p>Selected theme: {selectedNames.theme}</p>
>>>>>>> staging
      </div>
    </div>
  );
}
