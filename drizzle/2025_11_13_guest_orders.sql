-- ============================
-- GUEST ORDERS TABLE
-- ============================

CREATE TABLE guest_orders (
  id TEXT PRIMARY KEY,                            -- uuid
  email TEXT NOT NULL,                            -- guest email collected via Stripe Checkout
  guest_token TEXT NOT NULL,                      -- anonymous identifier
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- STRIPE FIELDS
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_receipt_url TEXT,
  stripe_card_brand TEXT,
  stripe_last4 TEXT,
  paid_at TIMESTAMPTZ
);

-- ============================
-- GUEST ORDER ITEMS
-- ============================

CREATE TABLE guest_order_items (
  id TEXT PRIMARY KEY,                            -- uuid
  guest_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,

  CONSTRAINT fk_guest_order
    FOREIGN KEY (guest_order_id) REFERENCES guest_orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_guest_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
);

-- ============================
-- INDEXES (improve merge performance)
-- ============================

CREATE INDEX idx_guest_orders_email ON guest_orders(email);
CREATE INDEX idx_guest_orders_token ON guest_orders(guest_token);
CREATE INDEX idx_guest_items_order ON guest_order_items(guest_order_id);
