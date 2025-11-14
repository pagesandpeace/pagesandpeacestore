import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const base =
      (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0)
        ? process.env.NEXT_PUBLIC_SITE_URL
        : "http://localhost:3000";

    const url = `${base}/vouchers/${encodeURIComponent(code)}`;

    // High-res PNG for crisp scan/print
    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      margin: 1,
      width: 1024,
      errorCorrectionLevel: "M",
    });

    // ✅ Ensure BodyInit type compatibility by using Uint8Array
    const pngUint8 = new Uint8Array(pngBuffer);

    return new Response(pngUint8, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("QR generation error:", e);
    return new Response(JSON.stringify({ error: "Failed to generate QR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
