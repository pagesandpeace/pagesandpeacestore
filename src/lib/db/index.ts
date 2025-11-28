import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

/* -------------------------------------------------------
   UNIVERSAL DB URL RESOLUTION
   (Allows seed scripts to override DATABASE_URL)
-------------------------------------------------------- */
const runtimeDbUrl =
  process.env.SEED_DATABASE_URL || process.env.DATABASE_URL;

console.log("👉 DB URL LOADED =", runtimeDbUrl);

/* -------------------------------------------------------
   VALIDATION
-------------------------------------------------------- */
if (!runtimeDbUrl) {
  throw new Error(
    "❌ No DATABASE_URL or SEED_DATABASE_URL provided. Cannot connect to DB."
  );
}

/* -------------------------------------------------------
   CLEAN CONNECTION URL (remove pgbouncer)
-------------------------------------------------------- */
const cleanUrl = runtimeDbUrl
  .replace("?pgbouncer=true&sslmode=require", "")
  .replace("&pgbouncer=true", "")
  .replace("?sslmode=require", "");

console.log("🔗 CLEANED URL =", cleanUrl);

/* -------------------------------------------------------
   GLOBAL CACHE
-------------------------------------------------------- */
const globalForDb = global as unknown as {
  pgPool?: Pool;
  db?: ReturnType<typeof drizzle>;
};

if (!globalForDb.pgPool) {
  globalForDb.pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });
}

if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db;

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
