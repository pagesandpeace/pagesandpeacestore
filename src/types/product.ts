/* ------------------------------------------
   BLIND DATE
------------------------------------------- */
export type BlindDateMetadata = {
  theme: string;
  colour: string;
  vibe: string;
  items: string[];
};

/* ------------------------------------------
   BOOK
------------------------------------------- */
export type BookMetadata = {
  isbn: string;
};

/* ------------------------------------------
   COFFEE
------------------------------------------- */
export type CoffeeMetadata = {
  roast: string;
  origin: string;
  weight: string;
  grind: string;
  tasting_notes: string;
};

/* ------------------------------------------
   MERCH
------------------------------------------- */
export type MerchMetadata = {
  size: string;
  material: string;
  colour: string;
};

/* ------------------------------------------
   GENERAL PRODUCT (fallback)
------------------------------------------- */
export type GeneralMetadata = {
  [key: string]: string | number | boolean | null;
};

/* ------------------------------------------
   UNION OF ALL METADATA
------------------------------------------- */
export type ProductMetadata =
  | BlindDateMetadata
  | BookMetadata
  | CoffeeMetadata
  | MerchMetadata
  | GeneralMetadata;

/* ------------------------------------------
   PRODUCT BASE TYPE
------------------------------------------- */
export type Product = {
  id: string;
  name: string;
  slug: string;

  description: string;
  price: number;

  image_url: string | null;
  product_type: string;       // EXACT match with DB + UI
  inventory_count: number;

  metadata: ProductMetadata;

  // Book-only
  genre_id?: string | null;
  author?: string;
  format?: string;
  language?: string;

  created_at?: string;
  updated_at?: string;
};
