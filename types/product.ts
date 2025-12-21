export type BaseProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url: string;
  product_type: string;
  description?: string;
  metadata?: Record<string, any>;
};

export type BlindDateProduct = BaseProduct & {
  product_type: "blind-date";
  metadata: {
    theme?: string;
    vibe?: string;
    colour?: string;
  };
};

export type BookProduct = BaseProduct & {
  product_type: "book";
  metadata: {
    author?: string;
    genre?: string;
    isbn?: string;
  };
};

export type MerchProduct = BaseProduct & {
  product_type: "merch";
  metadata: {
    variant?: string;
  };
};

export type GenericProduct = BaseProduct;

export type Product =
  | BlindDateProduct
  | BookProduct
  | MerchProduct
  | GenericProduct;
