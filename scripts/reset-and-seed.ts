// -------------------------------------------
// SAFE RESET + SEED FOR SUPABASE STAGING
// -------------------------------------------

import { Pool } from "pg";
import { exec } from "child_process";

// ⭐ YOUR STAGING DATABASE URL (correct SSL + pooler)
const DATABASE_URL =
  "postgresql://postgres.vhaevpfapegwzfjlqaws:rGUbJ!9$.nDvRkB@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=no-verify";

console.log("🔄 RESET + SEED STARTING...");
console.log("👉 Using DB:", DATABASE_URL);

// -------------------------------------------
// PG CONNECTION
// -------------------------------------------

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// -------------------------------------------
// TABLES TO RESET (SAFE ORDER)
// DO NOT INCLUDE drizzle_migrations, sessions, accounts, verifications
// -------------------------------------------

const TABLES = [
  "event_bookings",
  "events",
  "event_category_links",
  "event_categories",
  "voucher_redemptions",
  "vouchers",
  "loyalty_ledger",
  "loyalty_members",
  "guest_order_items",
  "guest_orders",
  "order_items",
  "orders",
  "products",
  "genres",
  "stores",
  "users"
];

// -------------------------------------------
// TRUNCATE FUNCTION
// -------------------------------------------

async function resetDatabase() {
  console.log("🧽 Clearing tables...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const table of TABLES) {
      console.log(`   • Truncating ${table}...`);
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    await client.query("COMMIT");
    console.log("✔ Database reset complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Reset failed:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// -------------------------------------------
// RUN SEED SCRIPT
// -------------------------------------------

function runSeed() {
  console.log("🌱 Running seed...");
  exec("npx tsx scripts/seed-standalone.ts", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Seed failed:", err);
      console.error(stderr);
      process.exit(1);
    }
    console.log(stdout);
    console.log("✅ Reset + Seed complete.");
    process.exit(0);
  });
}

// -------------------------------------------
// MAIN EXECUTION
// -------------------------------------------

(async () => {
  await resetDatabase();
  runSeed();
})();
