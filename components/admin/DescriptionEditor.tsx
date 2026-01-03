"use client";

import { useState } from "react";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";

type DescriptionEditorProps = {
  productId: string;
  value: string;
  onChange: (value: string) => void;
  onError?: (msg: string) => void;
};

export default function DescriptionEditor({
  productId,
  value,
  onChange,
  onError,
}: DescriptionEditorProps) {
  const [generating, setGenerating] = useState(false);

  async function generateDescription() {
    setGenerating(true);

    try {
      const res = await fetch(
        `/api/admin/products/${productId}/generate-description`,
        {
          method: "POST",
          credentials: "include",
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
