import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

// ✅ Choose DATABASE_URL first, fallback to DIRECT_URL if needed
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

// ✅ Log once when loaded
console.log("📡 Connecting to DB:", connectionString);

const globalForDb = global as unknown as { pgPool?: Pool; db?: ReturnType<typeof drizzle> };

if (!globalForDb.pgPool) {
  globalForDb.pgPool = new Pool({
    connectionString,
    ssl: {
      require: true,
      rejectUnauthorized: false, // 👈 critical: allows self-signed certs
    },
  });
}

if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db!;
