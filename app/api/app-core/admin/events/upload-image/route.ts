import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP image up to 8 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "pagesandpeace/rebuild-events", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
        (error, upload) => error || !upload ? reject(error ?? new Error("Upload failed")) : resolve({ secure_url: upload.secure_url })
      );
      stream.end(buffer);
    });
    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "Image upload failed." }, { status: 502 });
  }
}
