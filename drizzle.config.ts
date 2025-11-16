import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export default defineConfig({
  dialect: "postgresql",

  // required in your drizzle version
  schema: "./src/lib/db/schema/index.ts",

  introspect: {
    casing: "preserve",
  },

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  out: "./drizzle",
  strict: true,
});
