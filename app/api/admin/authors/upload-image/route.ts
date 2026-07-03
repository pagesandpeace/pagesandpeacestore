import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/admin/requireAdmin";

// 🔥 Uses the same Cloudinary env vars as events
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
    /* --------------------------------------------------
       1) Require admin before upload
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /* --------------------------------------------------
       2) Read uploaded file
    -------------------------------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       3) Convert file -> buffer
    -------------------------------------------------- */
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* --------------------------------------------------
       4) Upload to Cloudinary
    -------------------------------------------------- */
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "pagesandpeace/authors",
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
    console.error("Author image upload error:", err);

    return NextResponse.json(
      { error: "Image upload failed" },
      { status: 500 }
    );
  }
}