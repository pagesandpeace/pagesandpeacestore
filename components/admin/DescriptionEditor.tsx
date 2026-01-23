"use client";

import { useState } from "react";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";

type DescriptionEditorProps = {
  /** Only required in edit mode */
  productId?: string;

  /** Draft or persisted product */
  mode?: "product" | "draft";

  /** Existing description */
  value: string;

  /** Update parent state */
  onChange: (value: string) => void;

  /** Optional error handler */
  onError?: (msg: string) => void;

  /** Optional context for draft AI generation */
  context?: {
    name?: string;
    supplierRef?: string;
    authorId?: string | null;
    format?: string;
    language?: string;
  };
};

export default function DescriptionEditor({
  productId,
  mode = "product",
  value,
  onChange,
  onError,
  context,
}: DescriptionEditorProps) {
  const [generating, setGenerating] = useState(false);

  async function generateDescription() {
    setGenerating(true);

    try {
      const res =
        mode === "product" && productId
          ? await fetch(
              `/api/admin/products/${productId}/generate-description`,
              {
                method: "POST",
                credentials: "include",
              }
            )
          : await fetch(
              `/api/admin/products/generate-description/draft`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(context ?? {}),
              }
            );

      const data = await res.json();

      if (!res.ok || !data.description) {
        throw new Error("Generation failed");
      }

      onChange(data.description);
    } catch {
      onError?.("AI description generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm">Description</label>

        <Button
          size="sm"
          variant="neutral"
          onClick={generateDescription}
          disabled={generating}
        >
          {generating ? "Generating…" : "Generate description"}
        </Button>
      </div>

      <TextArea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
