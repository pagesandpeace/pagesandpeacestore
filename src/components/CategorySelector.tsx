"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export default function CategorySelector({
  selected,
  onChange,
}: {
  selected: Category[];
  onChange: (cats: Category[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Prevent loop: block onChange from firing the first time
  const initialised = useRef(false);

  // Emit changes ONLY after initial load
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    // Only fire when user actually changed selection
    onChange(selected); 
  }, [selected]);

  // Live search
  useEffect(() => {
    const load = async () => {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);
      const res = await fetch(`/api/admin/event-categories/search?q=${query}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
    };

    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [query]);

  // Add category (user initiated)
  const addCategory = (cat: Category) => {
    if (selected.some((s) => s.id === cat.id)) return;
    const updated = [...selected, cat];
    onChange(updated);
    setQuery("");
    setResults([]);
  };

  // Remove chip
  const remove = (id: string) => {
    const updated = selected.filter((c) => c.id !== id);
    onChange(updated);
  };

  // Press ENTER = create new category
  const createNew = async () => {
    if (!query) return;

    const res = await fetch("/api/admin/event-categories/create", {
      method: "POST",
      body: JSON.stringify({ name: query }),
    });

    const cat = await res.json();
    addCategory(cat);
  };

  return (
    <div className="space-y-2">

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {selected.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded-full text-sm"
          >
            {c.name}
            <button onClick={() => remove(c.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <Input
        placeholder="Search or create category..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createNew()}
      />

      {/* Results */}
      {results.length > 0 && (
        <div className="border rounded-md mt-1 max-h-64 overflow-y-auto bg-white shadow">
          {results.map((cat) => (
            <div
              key={cat.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => addCategory(cat)}
            >
              {cat.name}
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
    </div>
  );
}
