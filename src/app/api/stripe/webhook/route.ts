// MINIMAL TEST WEBHOOK – no imports
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DO NOT TOUCH THIS YET
export async function POST() {
  console.log("🔥 Webhook HIT");
  return new Response("Webhook OK", { status: 200 });
}
