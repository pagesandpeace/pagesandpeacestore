"use client";

export default function BlindDateFilterBar({
  themes,
  vibes,
  colours,
  theme,
  vibe,
  colour,
}: {
  themes: string[];
  vibes: string[];
  colours: string[];
  theme: string;
  vibe: string;
  colour: string;
}) {
  function updateFilter(newTheme: string, newVibe: string, newColour: string) {
    const url = `/blind-date?theme=${newTheme}&vibe=${newVibe}&colour=${newColour}`;
    window.location.href = url;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* THEME */}
      <select
        className="p-3 border rounded-xl bg-white"
        value={theme}
        onChange={(e) => updateFilter(e.target.value, vibe, colour)}
      >
        <option value="">All Themes</option>
        {themes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* VIBE */}
      <select
        className="p-3 border rounded-xl bg-white"
        value={vibe}
        onChange={(e) => updateFilter(theme, e.target.value, colour)}
      >
        <option value="">All Vibes</option>
        {vibes.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      {/* COLOUR */}
      <select
        className="p-3 border rounded-xl bg-white"
        value={colour}
        onChange={(e) => updateFilter(theme, vibe, e.target.value)}
      >
        <option value="">All Colours</option>
        {colours.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
