import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export default defineConfig({
  dialect: "postgresql",

  schema: "./src/lib/db/schema/index.ts",

  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },

  out: "./drizzle",

  strict: false,

  introspect: {
    casing: "preserve",
  },

  migrations: {
    table: "drizzle_migrations",
    prefix: "timestamp",
  },
});
