import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

import { v4 as uuidv4 } from "uuid";
import { eq, inArray } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting seed...");
  const { db } = await import("./index");
  const { genres, products, users, orders, orderItems } = await import("./schema/index");

  /* ---------------- 1. GENRES ---------------- */
  const genreData = [
    { id: uuidv4(), name: "Books", description: "Curated reads for all ages." },
    { id: uuidv4(), name: "Coffee", description: "House blends and beans to brew at home." },
    { id: uuidv4(), name: "Memberships", description: "Exclusive Pages & Peace subscriptions." },
  ];
  await db.insert(genres).values(genreData).onConflictDoNothing();
  console.log("✅ Genres seeded.");

  /* ---------------- 2. PRODUCTS ---------------- */
  const productData = [
    {
      id: uuidv4(),
      name: "Pages & Peace Tote Bag",
      slug: "pages-peace-tote",
      description: "Eco-friendly tote bag with our logo.",
      price: 12.99,
      imageUrl: "https://via.placeholder.com/300",
      genreId: genreData[0].id,
    },
    {
      id: uuidv4(),
      name: "House Blend Coffee Beans 250g",
      slug: "house-blend-250g",
      description: "Smooth, balanced blend roasted locally.",
      price: 9.99,
      imageUrl: "https://via.placeholder.com/300",
      genreId: genreData[1].id,
    },
    {
      id: uuidv4(),
      name: "Monthly Book Club Membership",
      slug: "book-club-membership",
      description: "Join our book club and get 1 new read every month.",
      price: 29.99,
      imageUrl: "https://via.placeholder.com/300",
      genreId: genreData[2].id,
    },
  ];
  await db.insert(products).values(productData).onConflictDoNothing();
  console.log("✅ Products seeded.");

  // 🔄 Fetch actual product IDs from DB (in case they existed already)
  const slugs = productData.map((p) => p.slug);
  const existingProducts = await db.select().from(products).where(inArray(products.slug, slugs));
  const productMap = Object.fromEntries(existingProducts.map((p) => [p.slug, p.id]));

  /* ---------------- 3. USER ---------------- */
  const testEmail = "test@example.com";
  const testUserId = uuidv4();

  await db.insert(users).values({
    id: testUserId,
    name: "Test User",
    email: testEmail,
    emailVerified: true,
  }).onConflictDoNothing();

  const [existingUser] = await db.select().from(users).where(eq(users.email, testEmail));
  const userId = existingUser?.id ?? testUserId;
  console.log("✅ Test user ready:", userId);

  /* ---------------- 4. ORDER + ITEMS ---------------- */
  const orderId = uuidv4();

  await db.insert(orders).values({
    id: orderId,
    userId,
    total: 42.98,
    status: "completed",
  }).onConflictDoNothing();

  await db.insert(orderItems).values({
    id: uuidv4(),
    orderId,
    productId: productMap["pages-peace-tote"], // ✅ now guaranteed valid
    quantity: 1,
    price: 12.99,
  });

  await db.insert(orderItems).values({
    id: uuidv4(),
    orderId,
    productId: productMap["house-blend-250g"],
    quantity: 2,
    price: 9.99,
  });

  console.log("✅ Demo order seeded.");
  console.log("🌱 Seed completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
