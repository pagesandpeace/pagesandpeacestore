import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema"; // make sure this points to the table you added


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, message, email } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid rating" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length < 3) {
      return NextResponse.json(
        { error: "Message too short" },
        { status: 400 }
      );
    }

    await db.insert(feedback).values({
      rating,
      message,
      email: email || null,  // optional email
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ FEEDBACK SUBMIT ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
