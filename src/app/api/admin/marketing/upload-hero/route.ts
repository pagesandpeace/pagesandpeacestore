import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Ensure your ENV is correct
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const upload = await cloudinary.uploader.upload_stream({
      folder: "pagesandpeace/marketing/hero",
      transformation: [
        { width: 1920, crop: "scale" }, // desktop
      ],
    });

    // Because upload_stream uses a callback, wrap it in a promise:
    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "pagesandpeace/marketing/hero" },
        (err, result) => {
          if (err || !result) reject(err);
          else resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ imageUrl: url });
  } catch (err) {
    console.error("Cloudinary error", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
