type BackorderTitleSource = {
  products?: { name?: string | null } | null;
  temp_title?: string | null;
};

export function resolveBackorderTitle(
  row: BackorderTitleSource
): string {
  return (
    row.products?.name ??
    row.temp_title ??
    "Customer request"
  );
}
