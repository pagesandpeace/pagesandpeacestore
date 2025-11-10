import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";  // Import the schema (ensure it's correctly structured)
import { eq } from "drizzle-orm";

// **Database connection setup**
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

console.log("📡 Connecting to Supabase DB...");

const globalForDb = global as unknown as {
  pgPool?: Pool;
  db?: ReturnType<typeof drizzle>;
};

// Check if the connection pool is already set up, otherwise initialize it
if (!globalForDb.pgPool) {
  const cleanUrl = connectionString
    .replace("?pgbouncer=true&sslmode=require", "")
    .replace("&pgbouncer=true", "")
    .replace("?sslmode=require", "");

  globalForDb.pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,  // Trust self-signed Supabase SSL
    },
  });
}

// Set up drizzle if it's not already initialized
if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.pgPool, { schema });
}

export const db = globalForDb.db!;  // Export the `db` connection

// **Function to get a user by ID**
export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(schema.users)  // Assuming 'users' is your table
    .where(eq(schema.users.id, userId))
    .limit(1);  // Ensure only one user is returned

  return user;  // Return the user object (or null if not found)
}

// **Function to check loyalty status**
export async function checkLoyaltyStatus(userId: string) {
  const [loyaltyMember] = await db
    .select()
    .from(schema.loyaltyMembers)  // Assuming 'loyalty_members' is your table
    .where(eq(schema.loyaltyMembers.userId, userId))
    .limit(1);  // Ensure only one loyalty record is returned

  return loyaltyMember ? loyaltyMember.status === "active" : false;  // Return true if active, otherwise false
}
