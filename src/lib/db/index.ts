import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

console.log("📡 Connecting to Supabase DB...");

const globalForDb = global as unknown as {
  pgPool?: Pool;
  db?: ReturnType<typeof drizzle>;
};

if (!globalForDb.pgPool) {
  // 🩵 Supabase PgBouncer fix:
  // Remove sslmode and pgbouncer params from the connection string
  // because we handle SSL manually below.
  const cleanUrl = connectionString
    .replace("?pgbouncer=true&sslmode=require", "")
    .replace("&pgbouncer=true", "")
    .replace("?sslmode=require", "");

  globalForDb.pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false, // ✅ Trust self-signed Supabase SSL
    },
  });
}

if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db!;
