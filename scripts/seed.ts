import "dotenv/config";
import { db } from "@/lib/db";
import {
  stores,
  genres,
  products,
  eventCategories,
  events,
  vouchers,
  users,
  loyaltyMembers,
} from "@/lib/db/schema";

import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

async function seed() {
  console.log("🌱 Seeding staging database...");

  /* -----------------------------------------------------
     1. STORES (Chapters)
  ----------------------------------------------------- */
  const chapter1 = await db
    .insert(stores)
    .values({
      id: uuid(),
      name: "Pages & Peace – Chapter 1",
      code: "chapter1",
      address: "Main Street, Rossington",
      description: "Your cosy local bookstore and community haven.",
      chapter: 1,
      published: true,
      openingHours: {
        mon: "9:00–21:00",
        tue: "9:00–21:00",
        wed: "9:00–21:00",
        thu: "9:00–21:00",
        fri: "9:00–21:00",
        sat: "9:00–21:00",
        sun: "10:00–16:00",
      },
      collectionInstructions: "Collect from the front counter. Bring your order email.",
    })
    .onConflictDoNothing()
    .returning()
    .then(r => r[0]);

  const chapter2 = await db
    .insert(stores)
    .values({
      id: uuid(),
      name: "Pages & Peace – Chapter 2",
      code: "chapter2",
      address: "Doncaster High Street",
      description: "Our second home of calm, books, and coffee.",
      chapter: 2,
      published: true,
      openingHours: {
        mon: "9:00–21:00",
        tue: "9:00–21:00",
        wed: "9:00–21:00",
        thu: "9:00–21:00",
        fri: "9:00–21:00",
        sat: "9:00–21:00",
        sun: "10:00–16:00",
      },
      collectionInstructions: "Collect from the front counter.",
    })
    .onConflictDoNothing()
    .returning()
    .then(r => r[0]);

  /* -----------------------------------------------------
     2. GENRES
  ----------------------------------------------------- */
  const fiction = await db.insert(genres).values({
    id: "fiction",
    name: "Fiction",
    description: "Stories that transport and inspire.",
  }).onConflictDoNothing();

  const romance = await db.insert(genres).values({
    id: "romance",
    name: "Romance",
    description: "Love stories and heartfelt journeys.",
  }).onConflictDoNothing();

  const fantasy = await db.insert(genres).values({
    id: "fantasy",
    name: "Fantasy",
    description: "Magic, adventure, and epic worlds.",
  }).onConflictDoNothing();

  /* -----------------------------------------------------
     3. PRODUCTS
  ----------------------------------------------------- */
  const prodBook1 = await db.insert(products).values({
    id: uuid(),
    name: "The Silent Woods",
    slug: "the-silent-woods",
    description: "A haunting, atmospheric novel set deep in the northern forests.",
    price: "12.99",
    genre_id: "fiction",
    product_type: "book",
    author: "Amelia Hart",
    format: "Paperback",
    inventory_count: 10,
  }).returning().then(r => r[0]);

  const prodBook2 = await db.insert(products).values({
    id: uuid(),
    name: "Love in Madrid",
    slug: "love-in-madrid",
    description: "A warm romance novel perfect for a cosy evening.",
    price: "10.99",
    genre_id: "romance",
    product_type: "book",
    author: "Ana Velasco",
    format: "Paperback",
    inventory_count: 6,
  }).returning().then(r => r[0]);

  const prodCoffee = await db.insert(products).values({
    id: uuid(),
    name: "P&P House Coffee",
    slug: "pp-house-coffee",
    description: "Pages & Peace signature medium roast.",
    price: "8.00",
    product_type: "coffee",
    inventory_count: 25,
  }).returning().then(r => r[0]);

  const prodBlindDate = await db.insert(products).values({
    id: uuid(),
    name: "Blind Date With a Book",
    slug: "blind-date-book",
    description: "A wrapped mystery read just for you.",
    price: "11.50",
    product_type: "blind-date",
    metadata: {
      theme: "cozy",
      colour: "brown",
      vibe: "relaxing",
    },
    inventory_count: 15,
  }).returning().then(r => r[0]);

  /* -----------------------------------------------------
     4. EVENT CATEGORIES
  ----------------------------------------------------- */
  const silentReading = await db.insert(eventCategories).values({
    id: uuid(),
    name: "Silent Reading Club",
    slug: "silent-reading",
    description: "A peaceful hour of quiet reading.",
  }).returning().then(r => r[0]);

  /* -----------------------------------------------------
     5. EVENT
  ----------------------------------------------------- */
  const event1 = await db.insert(events).values({
    id: uuid(),
    productId: prodBlindDate.id,
    title: "Silent Reading Club",
    description: "Join us for a peaceful evening of reading in total silence.",
    subtitle: "Bring your favourite book or choose one in-store.",
    date: new Date().toISOString(),
    capacity: 20,
    pricePence: 1000,
    storeId: chapter1.id,
    published: true,
  }).returning().then(r => r[0]);

  /* -----------------------------------------------------
     6. TEST USER + LOYALTY
  ----------------------------------------------------- */
  const testUser = await db.insert(users).values({
    id: "test-user-1",
    name: "Test User",
    email: "test@example.com",
    loyaltyprogram: true,
    loyaltypoints: 150,
  }).onConflictDoNothing()
    .returning()
    .then(r => r[0]);

  await db.insert(loyaltyMembers).values({
    userId: "test-user-1",
    termsVersion: "1.0",
    tier: "starter",
  }).onConflictDoNothing();

  /* -----------------------------------------------------
     7. VOUCHER
  ----------------------------------------------------- */
  await db.insert(vouchers).values({
    id: uuid(),
    code: "PP-GIFT-TEST",
    amountInitialPence: 2000,
    amountRemainingPence: 2000,
    currency: "gbp",
    status: "active",
    buyerEmail: "buyer@example.com",
    recipientEmail: "recipient@example.com",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  }).onConflictDoNothing();

  console.log("✅ Seeding complete.");
}

seed().then(() => process.exit(0));
