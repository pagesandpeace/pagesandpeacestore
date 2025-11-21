// src/app/api/newsletter/track/open/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";

export async function GET(req: Request) {
  console.log("🐛 [OPEN] Route HIT");

  const url = new URL(req.url);
  console.log("🔍 FULL URL:", url.toString());

  const blastId = url.searchParams.get("blastId");
  const subscriber = url.searchParams.get("recipient");

  console.log("📥 Params:", { blastId, subscriber });

  if (!blastId || !subscriber) {
    console.log("❌ Missing params", { blastId, subscriber });
    return new NextResponse("Missing params", { status: 400 });
  }

  try {
    const device = detectDevice(req);
    console.log("📱 Device:", device);

    console.log("📝 INSERT OPEN", { blastId, subscriber, device });

    await db.insert(emailEvents).values({
      blastId,
      subscriber,
      eventType: "open",
      metadata: { device },
    });

    console.log("✅ OPEN Event Logged");
  } catch (err) {
    console.error("🔥 DB INSERT ERROR (OPEN):", err);
  }

  // 1×1 GIF
  const gif = Buffer.from(
    "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
    "base64"
  );

  return new NextResponse(gif, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": gif.length.toString(),
    },
  });
}

function detectDevice(req: Request) {
  const agent = req.headers.get("user-agent") || "";
  console.log("🕵️ User-Agent:", agent);

  if (/mobile/i.test(agent)) return "mobile";
  if (/tablet/i.test(agent)) return "tablet";
  return "desktop";
}
