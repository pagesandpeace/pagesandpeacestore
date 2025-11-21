"use client";

import { useState } from "react";

type Props = {
  onInsert: (html: string) => void;
};

export default function NewsletterAIAssistant({ onInsert }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function generate(mode: string, content: string = "") {
    try {
      setLoading(true);
      setStatus("Thinking…");

      const res = await fetch("/api/newsletter/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, content })
      });

      const data = await res.json();
      setLoading(false);

      if (!data.ok) {
        setStatus("⚠ Error: " + data.error);
        return;
      }

      onInsert(data.result);
      setStatus("✨ Inserted!");
      setTimeout(() => setStatus(""), 2000);

    } catch (err) {
      console.error(err);
      setStatus("⚠ AI failed.");
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-white shadow-sm space-y-4">
      <h2 className="text-xl font-bold">AI Assistant</h2>
      <p className="text-gray-600 text-sm">
        Generate cosy, bookish, Pages & Peace–styled newsletter sections.
      </p>

      {/* Status */}
      {status && (
        <div className="p-2 rounded bg-blue-50 text-blue-800 text-sm">
          {status}
        </div>
      )}

      {/* MAIN BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <button
  onClick={() => generate("full-draft")}
  disabled={loading}
  className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
>
  ✨ Full Newsletter Draft
</button>


        <button
          onClick={() => generate("rewrite", "Rewrite my draft softly")}
          disabled={loading}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          🖋 Rewrite My Text
        </button>

        <button
          onClick={() => generate("shorten")}
          disabled={loading}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          ✂ Shorten
        </button>

        <button
          onClick={() => generate("expand")}
          disabled={loading}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          ➕ Expand
        </button>
      </div>

      {/* FEATURE PANELS */}
      <h3 className="font-semibold pt-4">Insert Feature Panels</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => generate("book-spotlight")}
          disabled={loading}
          className="px-3 py-2 bg-amber-200 rounded hover:bg-amber-300 text-sm"
        >
          📚 Book Spotlight
        </button>

        <button
          onClick={() => generate("product-highlight")}
          disabled={loading}
          className="px-3 py-2 bg-green-200 rounded hover:bg-green-300 text-sm"
        >
          🛍 Product Highlight
        </button>

        <button
          onClick={() => generate("event-highlight")}
          disabled={loading}
          className="px-3 py-2 bg-blue-200 rounded hover:bg-blue-300 text-sm"
        >
          📅 Event Highlight
        </button>

        <button
          onClick={() => generate("loyalty-nudge")}
          disabled={loading}
          className="px-3 py-2 bg-purple-200 rounded hover:bg-purple-300 text-sm"
        >
          ❤️ Loyalty Nudge
        </button>

        <button
          onClick={() => generate("digital-twin")}
          disabled={loading}
          className="px-3 py-2 bg-teal-200 rounded hover:bg-teal-300 text-sm"
        >
          🤖 Digital Twin Moment
        </button>

        <button
          onClick={() => generate("community-corner")}
          disabled={loading}
          className="px-3 py-2 bg-pink-200 rounded hover:bg-pink-300 text-sm"
        >
          🫶 Community Corner
        </button>

        <button
          onClick={() => generate("cosy-joke")}
          disabled={loading}
          className="px-3 py-2 bg-yellow-200 rounded hover:bg-yellow-300 text-sm"
        >
          😄 Cosy Joke
        </button>
      </div>
    </div>
  );
}
