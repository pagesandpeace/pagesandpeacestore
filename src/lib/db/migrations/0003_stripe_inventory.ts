import { sql } from "drizzle-orm";

export const up = sql`
  ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;
`;

export const down = sql`
  ALTER TABLE products
  DROP COLUMN IF EXISTS stripe_product_id,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS inventory_count,
  DROP COLUMN IF EXISTS is_subscription;
`;
