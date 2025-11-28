// ============================================================================
// IMPORTS
// ============================================================================
import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  uuid,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm/relations";

// ============================================================================
// ENUMS
// ============================================================================
export const voucherStatus = pgEnum("voucher_status", [
  "active",
  "redeemed",
  "void",
]);

// ============================================================================
// CORE SYSTEM TABLES
// ============================================================================
export const drizzleMigrations = pgTable("drizzle_migrations", {
  id: serial().primaryKey(),
  hash: text().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text().primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  token: text().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// ============================================================================
// USERS + ACCOUNTS
// ============================================================================
export const users = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text(),
  loyaltyprogram: boolean().default(false).notNull(),
  loyaltypoints: integer().default(0).notNull(),
  role: text().default("customer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull(),

  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "string" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "string" }),

  scope: text(),
  password: text(),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// Guests
export const guests = pgTable("guests", {
  sessionToken: text("session_token").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// ============================================================================
// GENRES
// ============================================================================
export const genres = pgTable("genres", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// ============================================================================
// STORES (DECLARED BEFORE RELATIONS)
// ============================================================================
export const stores = pgTable("stores", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  code: text().notNull(),
  address: text().notNull(),
  description: text(),
  imageUrl: text("image_url"),
  chapter: integer().notNull(),
  published: boolean().default(true).notNull(),

  phone: text("phone"),
  email: text("email"),

  openingHours: jsonb("opening_hours")
    .$type<Record<string, string>>()
    .default({}),
  collectionInstructions: text("collection_instructions"),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});


// ============================================================================
// PRODUCTS
// ============================================================================
export const products = pgTable("products", {
  id: uuid().defaultRandom().primaryKey(),

  name: text().notNull(),
  slug: text().notNull(),
  description: text(),

  price: numeric({ precision: 10, scale: 2 }).notNull(),

  image_url: text("image_url"),
  genre_id: text("genre_id"),

  product_type: text("product_type").default("physical").notNull(),

  // ✔ FIXED JSONB TYPE
  metadata: jsonb("metadata")
    .$type<Record<string, unknown> | null>()
    .default({}),

  author: text(),
  format: text(),
  language: text(),

  stripe_product_id: text("stripe_product_id"),
  stripe_price_id: text("stripe_price_id"),

  inventory_count: integer("inventory_count").default(0).notNull(),
  is_subscription: boolean("is_subscription").default(false).notNull(),

  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// ============================================================================
// ORDERS
// ============================================================================
export const orders = pgTable("orders", {
  id: text().primaryKey(),
  userId: text("user_id").notNull(),
  total: numeric({ precision: 10, scale: 2 }).notNull(),
  status: text().default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),

  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeReceiptUrl: text("stripe_receipt_url"),
  stripeCardBrand: text("stripe_card_brand"),
  stripeLast4: text("stripe_last4"),

  paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
});

export const orderItems = pgTable("order_items", {
  id: text().primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
});

// Guest Orders
export const guestOrders = pgTable("guest_orders", {
  id: text().primaryKey(),
  email: text().notNull(),
  guestToken: text("guest_token").notNull(),
  total: numeric({ precision: 10, scale: 2 }).notNull(),
  status: text().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeReceiptUrl: text("stripe_receipt_url"),
  stripeCardBrand: text("stripe_card_brand"),
  stripeLast4: text("stripe_last4"),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
});

export const guestOrderItems = pgTable("guest_order_items", {
  id: text().primaryKey(),
  guestOrderId: text("guest_order_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
});

// ============================================================================
// LOYALTY
// ============================================================================
export const loyaltyMembers = pgTable("loyalty_members", {
  userId: text("user_id").primaryKey(),
  status: text().default("active").notNull(),
  tier: text().default("starter").notNull(),
  marketingConsent: boolean("marketing_consent").default(false).notNull(),
  termsVersion: text("terms_version").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: text().primaryKey(),
  userId: text("user_id").notNull(),
  type: text().notNull(),
  points: integer().notNull(),
  source: text().notNull(),
  metadata: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// ============================================================================
// VOUCHERS
// ============================================================================
export const vouchers = pgTable("vouchers", {
  id: uuid().defaultRandom().primaryKey(),
  code: varchar({ length: 32 }).notNull(),
  amountInitialPence: integer("amount_initial_pence").notNull(),
  amountRemainingPence: integer("amount_remaining_pence").notNull(),
  currency: varchar({ length: 10 }).default("gbp").notNull(),

  status: voucherStatus().default("active").notNull(),

  buyerEmail: varchar("buyer_email", { length: 255 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }),

  personalMessage: text("personal_message"),

  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),

  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const voucherRedemptions = pgTable("voucher_redemptions", {
  id: uuid().defaultRandom().primaryKey(),
  voucherId: uuid("voucher_id").notNull(),
  redeemedAmountPence: integer("redeemed_amount_pence").notNull(),
  note: text(),
  staffUserId: varchar("staff_user_id", { length: 64 }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

// ============================================================================
// EVENTS
// ============================================================================
export const events = pgTable("events", {
  id: uuid().defaultRandom().primaryKey(),
  productId: text("product_id").notNull(),

  title: text().notNull(),
  description: text().notNull(),
  subtitle: text(),
  shortDescription: text("short_description"),

  date: timestamp({ mode: "string" }).notNull(),
  capacity: integer().notNull(),
  pricePence: integer("price_pence").notNull(),
  imageUrl: text("image_url"),

  storeId: uuid("store_id").notNull(),
  published: boolean().default(true).notNull(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// Event Bookings
export const eventBookings = pgTable("event_bookings", {
  id: uuid().defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull(),
  userId: text("user_id").notNull(),

  name: text(),
  email: varchar({ length: 255 }),

  paid: boolean().default(false).notNull(),
  cancelled: boolean().default(false).notNull(),
  cancellationRequested: boolean("cancellation_requested").default(false).notNull(),
  refunded: boolean("refunded").default(false).notNull(),

  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeRefundId: text("stripe_refund_id"),
  refundProcessedAt: timestamp("refund_processed_at", { mode: "string" }),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// ============================================================================
// EVENT CATEGORIES
// ============================================================================
export const eventCategories = pgTable("event_categories", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const eventCategoryLinks = pgTable("event_category_links", {
  id: uuid().defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull(),
  categoryId: uuid("category_id").notNull(),
});

// ============================================================================
// MARKETING BLOCKS
// ============================================================================
export const marketing_blocks = pgTable("marketing_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),

  key: text("key").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  cta_text: text("cta_text"),
  cta_link: text("cta_link"),

  image_url: text("image_url"),

  visible: boolean("visible").default(true),

  starts_at: timestamp("starts_at", { mode: "string" }),
  ends_at: timestamp("ends_at", { mode: "string" }),

  created_at: timestamp("created_at", { mode: "string" }).defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull(),
  change: integer("change").notNull(),
  reason: text("reason").notNull(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});

// ============================================================================
// NEWSLETTER + FEEDBACK
// ============================================================================
export const feedback = pgTable("feedback", {
  id: uuid().defaultRandom().primaryKey(),
  rating: integer("rating").notNull(),
  message: text().notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const emailBlasts = pgTable("email_blasts", {
  id: uuid().defaultRandom().primaryKey(),
  subject: text().notNull(),
  body: text().notNull(),
  recipientCount: integer("recipient_count").notNull(),
  category: text("category").default("general").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const emailTemplates = pgTable("email_templates", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  category: text("category").default("general").notNull(),
  subject: text().notNull(),
  body: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// ============================================================================
// RELATIONS (Placed last)
// ============================================================================
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  orders: many(orders),
  loyaltyMembers: many(loyaltyMembers),
  loyaltyLedgers: many(loyaltyLedger),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  orderItems: many(orderItems),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  orderItems: many(orderItems),
  genre: one(genres, {
    fields: [products.genre_id],
    references: [genres.id],
  }),
  guestOrderItems: many(guestOrderItems),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  products: many(products),
}));

export const guestOrderItemsRelations = relations(guestOrderItems, ({ one }) => ({
  guestOrder: one(guestOrders, {
    fields: [guestOrderItems.guestOrderId],
    references: [guestOrders.id],
  }),
  product: one(products, {
    fields: [guestOrderItems.productId],
    references: [products.id],
  }),
}));

export const guestOrdersRelations = relations(guestOrders, ({ many }) => ({
  guestOrderItems: many(guestOrderItems),
}));

export const loyaltyMembersRelations = relations(loyaltyMembers, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyMembers.userId],
    references: [users.id],
  }),
}));

export const loyaltyLedgerRelations = relations(loyaltyLedger, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyLedger.userId],
    references: [users.id],
  }),
}));

export const voucherRedemptionsRelations = relations(voucherRedemptions, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherRedemptions.voucherId],
    references: [vouchers.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ many }) => ({
  voucherRedemptions: many(voucherRedemptions),
}));

export const eventBookingsRelations = relations(eventBookings, ({ one }) => ({
  event: one(events, {
    fields: [eventBookings.eventId],
    references: [events.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  store: one(stores, {
    fields: [events.storeId],
    references: [stores.id],
  }),
  eventBookings: many(eventBookings),
}));
// ============================================================================
// IDEMPOTENCY KEYS (Required for safe multi-submit API routes)
// ============================================================================
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").default("general").notNull(),
  response: jsonb("response").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

