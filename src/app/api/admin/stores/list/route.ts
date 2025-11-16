import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 🔐 Admin/Staff check
    const user = await getCurrentUserServer();
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 📌 Fetch stores with correct address
    const rows = await db
      .select({
        id: stores.id,
        name: stores.name,
        address: stores.address,
      })
      .from(stores);

    console.log("📦 [stores/list] Returning stores:", rows);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("❌ [stores/list] Failed to load stores:", err);
    return NextResponse.json(
      { error: "Failed to load stores" },
      { status: 500 }
    );
  }
}
