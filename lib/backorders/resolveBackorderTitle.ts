type BackorderTitleSource = {
  products?: {
    name?: string | null;
  }[] | null;
  temp_title?: string | null;
};

export function resolveBackorderTitle(
  row: BackorderTitleSource
): string {
  return (
    row.products?.[0]?.name ??
    row.temp_title ??
    "Customer request"
  );
}
