export function TableRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {children}
    </tr>
  );
}
