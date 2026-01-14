export function TableSurface({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-muted overflow-hidden bg-background">
      {children}
    </div>
  );
}
