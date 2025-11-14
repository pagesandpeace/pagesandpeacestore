// src/lib/db/schema/event_bookings.ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";

import { events, users } from "@/lib/db/schema";

export const eventBookings = pgTable("event_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),

  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),

  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name"),
  email: varchar("email", { length: 255 }),

  paid: boolean("paid").default(false).notNull(),
  cancelled: boolean("cancelled").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
