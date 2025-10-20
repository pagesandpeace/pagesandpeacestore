import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ✅ Load env before anything else

// ✅ Force DATABASE_URL to use DIRECT_URL for seed (optional but safer)
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined. Check your .env.local file.");
}

import { v4 as uuidv4 } from "uuid";

async function main() {
  console.log("🌱 Starting seed...");

  // ✅ Dynamically import db AFTER env is loaded
  const { db } = await import("./index");
  const { categories, products, users, orders, orderItems } = await import("./schema/index");

  // --- 1. Seed Categories ---
  const categoryData = [
    { id: uuidv4(), name: "Books", description: "Curated reads for all ages." },
    { id: uuidv4(), name: "Coffee", description: "House blends and beans to brew at home." },
    { id: uuidv4(), name: "Memberships", description: "Exclusive Pages & Peace subscriptions." },
  ];
  await db.insert(categories).values(categoryData).onConflictDoNothing();
  console.log("✅ Categories seeded.");

  // --- 2. Seed Products ---
  const productData = [
    {
      id: uuidv4(),
      name: "Pages & Peace Tote Bag",
      slug: "pages-peace-tote",
      description: "Eco-friendly tote bag with our logo.",
      price: "12.99",
      imageUrl: "https://via.placeholder.com/300",
      categoryId: categoryData[0].id,
    },
    {
      id: uuidv4(),
      name: "House Blend Coffee Beans 250g",
      slug: "house-blend-250g",
      description: "Smooth, balanced blend roasted locally.",
      price: "9.99",
      imageUrl: "https://via.placeholder.com/300",
      categoryId: categoryData[1].id,
    },
    {
      id: uuidv4(),
      name: "Monthly Book Club Membership",
      slug: "book-club-membership",
      description: "Join our book club and get 1 new read every month.",
      price: "29.99",
      imageUrl: "https://via.placeholder.com/300",
      categoryId: categoryData[2].id,
    },
  ];
  await db.insert(products).values(productData).onConflictDoNothing();
  console.log("✅ Products seeded.");

  // --- 3. Seed a Test User ---
  const testUserId = uuidv4();
  await db.insert(users).values({
    id: testUserId,
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
  }).onConflictDoNothing();
  console.log("✅ Test user seeded.");

  // --- 4. Seed an Order ---
  const orderId = uuidv4();
  await db.insert(orders).values({
    id: orderId,
    userId: testUserId,
    total: "42.98",
    status: "completed",
  }).onConflictDoNothing();

  await db.insert(orderItems).values([
    {
      id: uuidv4(),
      orderId,
      productId: productData[0].id,
      quantity: "1",
      price: productData[0].price,
    },
    {
      id: uuidv4(),
      orderId,
      productId: productData[1].id,
      quantity: "2",
      price: productData[1].price,
    },
  ]);

  console.log("✅ Demo order seeded.");
  console.log("🌱 Seed completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
