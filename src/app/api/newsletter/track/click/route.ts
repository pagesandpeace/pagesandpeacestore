// src/app/api/newsletter/track/click/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";

export async function GET(req: Request) {
  console.log("🐛 [CLICK] Route HIT");

  const urlObj = new URL(req.url);
  console.log("🔍 FULL URL:", urlObj.toString());

  const blastId = urlObj.searchParams.get("blastId");
  const subscriber = urlObj.searchParams.get("recipient");
  const url = urlObj.searchParams.get("url");

  console.log("📥 Params:", { blastId, subscriber, url });

  if (!blastId || !subscriber || !url) {
    console.log("❌ Missing params");
    return NextResponse.json({ ok: false, error: "Missing params" });
  }

  try {
    const device = detectDevice(req);
    const finalUrl = decodeURIComponent(url);

    console.log("📝 INSERT CLICK", { blastId, subscriber, finalUrl });

    await db.insert(emailEvents).values({
      blastId,
      subscriber,
      eventType: "click",
      metadata: {
        url: finalUrl,
        device,
      },
    });

    console.log("✅ CLICK Event Logged");

  } catch (err) {
    console.error("🔥 DB INSERT ERROR (CLICK):", err);
  }

  console.log("➡️ Redirecting to:", decodeURIComponent(url));
  return NextResponse.redirect(decodeURIComponent(url));
}

function detectDevice(req: Request) {
  const agent = req.headers.get("user-agent") || "";
  if (/mobile/i.test(agent)) return "mobile";
  if (/tablet/i.test(agent)) return "tablet";
  return "desktop";
}
