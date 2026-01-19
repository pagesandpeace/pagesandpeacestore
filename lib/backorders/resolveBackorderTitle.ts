type BackorderTitleSource = {
  products?: {
    name?: string | null;
  }[] | null;
  temp_title?: string | null;
};

export function resolveBackorderTitle(
  row: BackorderTitleSource
): string {
  const productName = row.products?.[0]?.name?.trim();
  if (productName) return productName;

  const tempTitle = row.temp_title?.trim();
  if (tempTitle) return tempTitle;

  return "Customer request";
}
