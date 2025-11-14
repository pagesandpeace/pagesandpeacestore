import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { products } from "./index";

export const events = pgTable("events", {
  id: text("id").primaryKey(),

  // Shopify model: event → product link
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),

  title: text("title").notNull(),
  description: text("description"),

  date: timestamp("date", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  pricePence: integer("price_pence").notNull(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),


  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
