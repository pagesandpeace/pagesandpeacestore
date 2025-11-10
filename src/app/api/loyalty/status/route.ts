import { NextRequest, NextResponse } from "next/server";
import { getUserById, checkLoyaltyStatus } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const loyaltyStatus = await checkLoyaltyStatus(userId);
    return NextResponse.json({ loyaltyprogram: loyaltyStatus }, { status: 200 });
  } catch (err) {
    console.error("Error fetching loyalty status:", err);
    return NextResponse.json({ error: "Failed to fetch loyalty status" }, { status: 500 });
  }
}
