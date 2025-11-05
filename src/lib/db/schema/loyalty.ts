// src/lib/db/schema/loyalty.ts
import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./index"; // your existing users

export const loyaltyMembers = pgTable("loyalty_members", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active | suspended | closed
  tier: text("tier").notNull().default("starter"),   // starter | silver | gold | platinum
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  termsVersion: text("terms_version").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: text("id").primaryKey(), // uuid
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),  // join_bonus | purchase_earn | manual_adjust | redeem
  points: integer("points").notNull(), // positive earn / negative redeem
  source: text("source").notNull(), // web | pos | admin | import
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Optional rules for automation (earn x points per £, promos, etc.)
export const earningRules = pgTable("earning_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  // e.g. {"type":"perCurrency","amountPerPoint":0.10} or {"type":"multiplier","multiplier":2}
  definition: jsonb("definition").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// For safe, idempotent API writes across retries
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(), // e.g. "loyalty.optin" or "loyalty.earn"
  response: jsonb("response").notNull(), // last JSON response
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
