// DIRECT STAGING-SEEDER — NO ENV, NO NEXT.JS, NO APP IMPORTS
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { v4 as uuid } from "uuid";

// -----------------------------------------------------
// 1. STAGING DATABASE URL (REAL ONE — FIXED SSL MODE)
// -----------------------------------------------------
const DATABASE_URL =
  "postgresql://postgres.vhaevpfapegwzfjlqaws:rGUbJ!9$.nDvRkB@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=no-verify";

console.log("🌱 Starting standalone seed...");
console.log("👉 USING =", DATABASE_URL);

// 🚨 IMPORTANT: sslmode=no-verify must match this:
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

// -----------------------------------------------------
// UTILS
// -----------------------------------------------------
const nowIso = () => new Date().toISOString();

// -----------------------------------------------------
// 2. SEED START
// -----------------------------------------------------
async function seed() {
  console.log("🌱 Seeding...");

  // -----------------------------------------------------
  // STORES
  // -----------------------------------------------------
  console.log("🏪 Seeding stores...");

  const rossington = await db
    .insert(schema.stores)
    .values({
      id: uuid(),
      name: "Pages & Peace – Chapter 1",
      code: "chapter1",
      address: "8 Eva Building, Kings Avenue, Rossington, Doncaster, DN11 0PF",
      description:
        "Our cosy flagship store in Rossington — books, calm, and community.",
      chapter: 1,
      published: true,
      openingHours: {
        mon: "9:00–21:00",
        tue: "9:00–21:00",
        wed: "9:00–21:00",
        thu: "9:00–21:00",
        fri: "9:00–21:00",
        sat: "9:00–21:00",
        sun: "9:00–16:00",
      },
      collectionInstructions:
        "Please bring your order email and present your order number to a staff member upon collection.",
    })
    .onConflictDoNothing()
    .returning()
    .then((r) => r[0]);

  const armthorpe = await db
    .insert(schema.stores)
    .values({
      id: uuid(),
      name: "Pages & Peace – Chapter 2",
      code: "chapter2",
      address: "Armthorpe High Street, Doncaster",
      description: "Our future second Chapter — a calm bookshop for Armthorpe.",
      chapter: 2,
      published: true,
      openingHours: {
        mon: "9:00–21:00",
        tue: "9:00–21:00",
        wed: "9:00–21:00",
        thu: "9:00–21:00",
        fri: "9:00–21:00",
        sat: "9:00–21:00",
        sun: "9:00–16:00",
      },
      collectionInstructions:
        "Please bring your order email and present your order number to a staff member upon collection.",
    })
    .onConflictDoNothing()
    .returning()
    .then((r) => r[0]);

  console.log("✔ Stores seeded");

  // -----------------------------------------------------
  // GENRES
  // -----------------------------------------------------
  console.log("📚 Seeding genres...");

  const allGenres = [
    { id: "fiction", name: "Fiction" },
    { id: "romance", name: "Romance" },
    { id: "fantasy", name: "Fantasy" },
    { id: "horror", name: "Horror" },
    { id: "erotic-horror", name: "Erotic Horror" },
    { id: "thriller", name: "Thriller" },
    { id: "nonfiction", name: "Non-fiction" },
    { id: "poetry", name: "Poetry" },
    { id: "mystery", name: "Mystery" },
    { id: "young-adult", name: "Young Adult" },
  ];

  for (const g of allGenres) {
    await db.insert(schema.genres).values(g).onConflictDoNothing();
  }

  console.log("✔ Genres seeded");

  // -----------------------------------------------------
  // BOOKS (Violet Rose)
  // -----------------------------------------------------
  console.log("📖 Seeding Violet Rose books...");

  const books = [
    {
      name: "Written in the Scars",
      slug: "written-in-the-scars",
      author: "Violet Rose",
      price: "8.50",
      inventory: 3,
      signed: false,
    },
    {
      name: "Written in the Scars (Signed)",
      slug: "written-in-the-scars-signed",
      author: "Violet Rose",
      price: "11.50",
      inventory: 2,
      signed: true,
    },
    {
      name: "Written in the Nightmares",
      slug: "written-in-the-nightmares",
      author: "Violet Rose",
      price: "8.95",
      inventory: 3,
      signed: false,
    },
    {
      name: "Written in the Nightmares (Signed)",
      slug: "written-in-the-nightmares-signed",
      author: "Violet Rose",
      price: "11.95",
      inventory: 2,
      signed: true,
    },
    {
      name: "Bloodlust and Betrayal",
      slug: "bloodlust-and-betrayal",
      author: "Violet Rose",
      price: "7.99",
      inventory: 2,
      signed: false,
    },
    {
      name: "Bloodlust and Betrayal (Signed)",
      slug: "bloodlust-and-betrayal-signed",
      author: "Violet Rose",
      price: "10.99",
      inventory: 1,
      signed: true,
    },
    {
      name: "Ruin Me",
      slug: "ruin-me",
      author: "Violet Rose",
      price: "9.99",
      inventory: 2,
      signed: false,
    },
    {
      name: "Ruin Me (Signed)",
      slug: "ruin-me-signed",
      author: "Violet Rose",
      price: "12.99",
      inventory: 1,
      signed: true,
    },
  ];

  for (const b of books) {
    await db
      .insert(schema.products)
      .values({
        id: uuid(),
        name: b.name,
        slug: b.slug,
        author: b.author,
        format: "Paperback",
        price: b.price,
        genre_id: "erotic-horror",
        product_type: "book",
        metadata: b.signed ? { signed: true } : {},
        inventory_count: b.inventory,
      })
      .returning()
      .catch(() => {});
  }

  console.log("✔ Books seeded");

  // -----------------------------------------------------
  // BLIND DATES
  // -----------------------------------------------------
  console.log("🎁 Seeding Blind Dates...");

  const blindDateVariants = [
    { name: "Blind Date – Pre-Loved", slug: "blind-date-pre-loved", vibe: "cozy" },
    { name: "Blind Date – New", slug: "blind-date-new", vibe: "mysterious" },
    {
      name: "Blind Date – Gift Edition",
      slug: "blind-date-gift",
      vibe: "heartwarming",
    },
  ];

  for (const bd of blindDateVariants) {
    await db.insert(schema.products).values({
      id: uuid(),
      name: bd.name,
      slug: bd.slug,
      description: "A wrapped mystery book chosen for its vibe and genre.",
      price: "11.50",
      product_type: "blind-date",
      metadata: {
        theme: "mystery",
        colour: "brown",
        vibe: bd.vibe,
      },
      inventory_count: 15,
      genre_id: "fiction",
    });
  }

  console.log("✔ Blind Dates seeded");

  // -----------------------------------------------------
  // MERCH
  // -----------------------------------------------------
  console.log("🛍 Seeding merch...");

  const merch = [
    {
      name: "Pages & Peace Tote Bag",
      slug: "pp-tote-bag",
      price: "10.00",
    },
    {
      name: "Key Ring",
      slug: "pp-keyring",
      price: "3.50",
    },
    {
      name: "Thumb Holder",
      slug: "pp-thumb-holder",
      price: "3.50",
    },
  ];

  for (const m of merch) {
    await db.insert(schema.products).values({
      id: uuid(),
      name: m.name,
      slug: m.slug,
      price: m.price,
      description: "Pages & Peace merchandise.",
      product_type: "merch",
      inventory_count: 25,
    });
  }

  console.log("✔ Merch seeded");

  // -----------------------------------------------------
  // EVENT CATEGORIES
  // -----------------------------------------------------
  console.log("📅 Seeding event categories...");

  const silentReadingCat = await db
    .insert(schema.eventCategories)
    .values({
      id: uuid(),
      name: "Silent Reading Night",
      slug: "silent-reading-night",
      description: "Cosy quiet reading evenings.",
    })
    .returning()
    .then((r) => r[0]);

  await db.insert(schema.eventCategories).values({
    id: uuid(),
    name: "Wellbeing",
    slug: "wellbeing",
    description: "Calm, rest, mindfulness.",
  });

  console.log("✔ Event categories seeded");

  // -----------------------------------------------------
  // EVENT PRODUCT (required)
  // -----------------------------------------------------
  console.log("🧾 Creating event product...");

  const silentReadingProduct = await db
    .insert(schema.products)
    .values({
      id: uuid(),
      name: "Silent Reading Night Ticket",
      slug: "silent-reading-night-ticket",
      description:
        "Ticket for our cosy Silent Reading Night (includes drink + snack).",
      price: "10.00",
      product_type: "event",
      inventory_count: 9999,
    })
    .returning()
    .then((r) => r[0]);

  console.log("✔ Event product created:", silentReadingProduct.id);

  // -----------------------------------------------------
  // EVENTS
  // -----------------------------------------------------
  console.log("🌙 Seeding Silent Reading Night events...");

  const eventDates = [
    "2025-11-23T18:00:00.000Z",
    "2025-12-07T18:00:00.000Z",
    "2025-12-10T18:00:00.000Z",
  ];

  for (const date of eventDates) {
    await db.insert(schema.events).values({
      id: uuid(),
      productId: silentReadingProduct.id,
      title: "Silent Reading Night",
      description:
        "An evening of cosy, peaceful reading with a drink, snack and calm atmosphere.",
      subtitle: "Switch Off. Slow Down. Sink Into a Story.",
      shortDescription: "A cosy evening of quiet reading.",
      date,
      capacity: 20,
      pricePence: 1000,
      storeId: rossington.id,
      published: true,
    });
  }

  console.log("✔ Events seeded");

  // -----------------------------------------------------
  // USERS
  // -----------------------------------------------------
  console.log("👤 Seeding users...");

  await db
    .insert(schema.users)
    .values({
      id: "admin-user",
      name: "Admin",
      email: "admin@pagesandpeace.co.uk",
      role: "admin",
    })
    .onConflictDoNothing();

  await db
    .insert(schema.users)
    .values({
      id: "test-user-1",
      name: "Matthew Mclauchlan",
      email: "matthewmclauchlan@gmail.com",
      role: "customer",
    })
    .onConflictDoNothing();

  console.log("✔ Users seeded");

  // -----------------------------------------------------
  // END
  // -----------------------------------------------------
  console.log("🎉 ALL DONE — Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ SEED FAILED:", err);
  process.exit(1);
});
