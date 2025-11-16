import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema"; // <— FIXED
import { eq } from "drizzle-orm";

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
  const cleanUrl = connectionString
    .replace("?pgbouncer=true&sslmode=require", "")
    .replace("&pgbouncer=true", "")
    .replace("?sslmode=require", "");

  globalForDb.pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db!;

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
