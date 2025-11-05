import { pgTable, text, timestamp, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";

/* ---------------- USERS ---------------- */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),

  // ✅ Add loyalty fields here
  loyaltyprogram: boolean("loyaltyprogram").default(false).notNull(),
  loyaltypoints: integer("loyaltypoints").default(0).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});


/* ---------------- SESSIONS ---------------- */
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------------- ACCOUNTS ---------------- */
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------------- VERIFICATIONS ---------------- */
export const verifications = pgTable("verifications", {   // 👈 make plural here
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});


/* ---------------- GUESTS ---------------- */
export const guests = pgTable("guests", {
  sessionToken: text("session_token").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ---------------- GENRES (formerly categories) ---------------- */
export const genres = pgTable("genres", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ---------------- PRODUCTS ---------------- */
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

/* ---------------- ORDERS ---------------- */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).$type<number>().notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ---------------- ORDER ITEMS ---------------- */
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").$type<number>().notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).$type<number>().notNull(),
});

/* ---------------- IDEMPOTENCY (for safe API retries) ---------------- */
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(), // Unique request key
  scope: text("scope").notNull().default("loyalty_optin"), // Context for where it's used
  response: jsonb("response").default({}), // Optional stored response
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ✅ Loyalty schema (modular but included for migrations)
export * from "./loyalty";