export default function ProductBadge({ genre }: { genre: string | null }) {
  if (!genre) return null;

  return (
    <span className="inline-block bg-[var(--accent)]/10 text-[var(--accent)]
                     px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
      {genre}
    </span>
  );
}
