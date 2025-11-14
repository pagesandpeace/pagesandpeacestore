// src/lib/db/schema/index.ts
import {
  pgTable,
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

/* USERS */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),

  loyaltyprogram: boolean("loyaltyprogram").default(false).notNull(),
  loyaltypoints: integer("loyaltypoints").default(0).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* SESSIONS */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ACCOUNTS */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* VERIFICATIONS */
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* GUEST SESSIONS */
export const guests = pgTable("guests", {
  sessionToken: text("session_token").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* GENRES */
export const genres = pgTable("genres", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* PRODUCTS */
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).$type<number>().notNull(),
  imageUrl: text("image_url"),
  genreId: text("genre_id").references(() => genres.id, { onDelete: "set null" }),

  author: text("author"),
  format: text("format"),
  language: text("language"),

  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  inventoryCount: integer("inventory_count").default(0).notNull(),
  isSubscription: boolean("is_subscription").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ORDERS */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  total: numeric("total", { precision: 10, scale: 2 }).$type<number>().notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeReceiptUrl: text("stripe_receipt_url"),
  stripeCardBrand: text("stripe_card_brand"),
  stripeLast4: text("stripe_last4"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/* ORDER ITEMS */
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),

  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).$type<number>().notNull(),
});

/* IDEMPOTENCY KEYS */
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull().default("loyalty_optin"),
  response: jsonb("response").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* GUEST ORDERS */
export const guestOrders = pgTable("guest_orders", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  guestToken: text("guest_token").notNull(),

  total: numeric("total", { precision: 10, scale: 2 }).$type<number>().notNull(),
  status: text("status").default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeReceiptUrl: text("stripe_receipt_url"),
  stripeCardBrand: text("stripe_card_brand"),
  stripeLast4: text("stripe_last4"),

  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const guestOrderItems = pgTable("guest_order_items", {
  id: text("id").primaryKey(),
  guestOrderId: text("guest_order_id")
    .references(() => guestOrders.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "set null" })
    .notNull(),

  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).$type<number>().notNull(),
});

/* LOYALTY MEMBERS */
export const loyaltyMembers = pgTable("loyalty_members", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  tier: text("tier").notNull().default("starter"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  termsVersion: text("terms_version").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* LOYALTY LEDGER */
export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  source: text("source").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* EARNING RULES */
export const earningRules = pgTable("earning_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  definition: jsonb("definition").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* VOUCHERS ENUM */
export const voucherStatusEnum = pgEnum("voucher_status", [
  "active",
  "redeemed",
  "void",
]);

/* VOUCHERS */
export const vouchers = pgTable("vouchers", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),

  amountInitialPence: integer("amount_initial_pence").notNull(),
  amountRemainingPence: integer("amount_remaining_pence").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("gbp"),

  status: voucherStatusEnum("status").notNull().default("active"),

  buyerEmail: varchar("buyer_email", { length: 255 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  personalMessage: text("personal_message"),

  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* VOUCHER REDEMPTIONS */
export const voucherRedemptions = pgTable("voucher_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  voucherId: uuid("voucher_id")
    .notNull()
    .references(() => vouchers.id, { onDelete: "cascade" }),
  redeemedAmountPence: integer("redeemed_amount_pence").notNull(),
  note: text("note"),
  staffUserId: varchar("staff_user_id", { length: 64 }),
  location: varchar("location", { length: 120 }).default("store"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
});

export { users as user };
export { sessions as session };
export { accounts as account };
export { verifications as verification };