import { pgTable, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { users, orders, products } from "../schema/index";



/* ---------------- STRIPE PRODUCTS ---------------- */
// Links each Pages & Peace product to its corresponding Stripe product
export const stripeProducts = pgTable("stripe_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  stripeProductId: text("stripe_product_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull().unique(),
  active: boolean("active").default(true),
  currency: text("currency").default("gbp"),
  unitAmount: numeric("unit_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------------- STRIPE CUSTOMERS ---------------- */
// Maps local users to their Stripe customer records
export const stripeCustomers = pgTable("stripe_customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------------- SUBSCRIPTIONS ---------------- */
// Tracks active subscriptions (for Book Club, Gift Boxes, etc.)
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
