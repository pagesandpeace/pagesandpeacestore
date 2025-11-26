import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentUserServer } from "@/lib/auth/actions";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return a proper Promise wrapper for Cloudinary upload
    const uploadResult: { secure_url: string } = await new Promise(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "pagesandpeace/products",
              resource_type: "image",
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result as { secure_url: string });
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed", detail: String(err) },
      { status: 500 }
    );
  }
}
