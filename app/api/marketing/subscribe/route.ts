import crypto from "crypto";
import { NextResponse } from "next/server";
import { appCoreDb } from "@/lib/app-core/service";

export const runtime = "nodejs";

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value) && value.length <= 254;

export async function POST(request: Request) {
  let body: { email?: unknown; website?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (typeof body.website === "string" && body.website) return NextResponse.json({ success: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const db = appCoreDb();
  const [emailLimit, ipLimit] = await Promise.all([
    db.rpc("consume_auth_rate_limit", { p_bucket: `newsletter:email:${hash(email)}`, p_limit: 3, p_window_seconds: 900 }).single(),
    db.rpc("consume_auth_rate_limit", { p_bucket: `newsletter:ip:${hash(forwarded)}`, p_limit: 10, p_window_seconds: 3600 }).single(),
  ]);
  if (emailLimit.error || ipLimit.error || emailLimit.data !== true || ipLimit.data !== true) return NextResponse.json({ success: true });

  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!publicationId || !apiKey) return NextResponse.json({ error: "Email signup is not configured" }, { status: 503 });

  try {
    const response = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: true }),
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to subscribe" }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to subscribe" }, { status: 502 });
  }
}
