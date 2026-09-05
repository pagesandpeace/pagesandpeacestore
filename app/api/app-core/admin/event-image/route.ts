import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  if (!await requireAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be smaller than 8 MB." }, { status: 400 });

  try {
    const encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await cloudinary.uploader.upload(`data:${file.type};base64,${encoded}`, {
      folder: "pages-and-peace/events",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    });
    return NextResponse.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("app_core event image upload failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "The image could not be uploaded. Please try again." }, { status: 502 });
  }
}
