export function TableBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <tbody className="divide-y divide-muted">{children}</tbody>;
}
