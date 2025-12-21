import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// 🔥 Make sure these are in your .env.local
// CLOUDINARY_CLOUD_NAME=xxx
// CLOUDINARY_API_KEY=xxx
// CLOUDINARY_API_SECRET=xxx

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type CloudinaryUploadResult = {
  secure_url: string;
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file -> buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary (wrap callback API in Promise)
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "pagesandpeace/events",
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) {
              reject(error);
            } else {
              resolve({ secure_url: result.secure_url });
            }
          }
        );

        stream.end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Image upload failed" },
      { status: 500 }
    );
  }
}
