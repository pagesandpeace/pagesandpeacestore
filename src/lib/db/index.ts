import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

/* -------------------------------------------------------
   DEBUG: PRINT THE ACTUAL ENVIRONMENT VALUES
-------------------------------------------------------- */
console.log("👉 USING DATABASE_URL =", process.env.DATABASE_URL);
console.log("👉 USING DIRECT_URL   =", process.env.DIRECT_URL);

/* -------------------------------------------------------
   VALIDATION
-------------------------------------------------------- */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

console.log("📡 Connecting to Supabase DB...");

/* -------------------------------------------------------
   GLOBAL CACHED POOL
-------------------------------------------------------- */
const globalForDb = global as unknown as {
  pgPool?: Pool;
  db?: ReturnType<typeof drizzle>;
};

/* -------------------------------------------------------
   CLEAN THE URL (for pgbouncer / ssl issues)
-------------------------------------------------------- */
if (!globalForDb.pgPool) {
  const cleanUrl = connectionString
    .replace("?pgbouncer=true&sslmode=require", "")
    .replace("&pgbouncer=true", "")
    .replace("?sslmode=require", "");

  console.log("🔗 Final DB Connection URL =", cleanUrl);

  globalForDb.pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

/* -------------------------------------------------------
   CREATE DRIZZLE INSTANCE
-------------------------------------------------------- */
if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db!;

/* -------------------------------------------------------
   HELPERS
-------------------------------------------------------- */

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return user;
}

export async function checkLoyaltyStatus(userId: string) {
  const [loyaltyMember] = await db
    .select()
    .from(schema.loyaltyMembers)
    .where(eq(schema.loyaltyMembers.userId, userId))
    .limit(1);

  return loyaltyMember ? loyaltyMember.status === "active" : false;
}
