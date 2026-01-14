export function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <thead className="text-xs uppercase tracking-wide text-foreground/60 border-b border-muted">
      {children}
    </thead>
  );
}
