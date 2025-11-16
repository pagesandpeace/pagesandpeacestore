/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { auth } from "@/lib/auth";

/* ------------------------------------------
   CLOUDINARY CONFIG
------------------------------------------- */
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

/* ------------------------------------------
   POST /api/admin/events/upload-image
------------------------------------------- */
export async function POST(request: Request) {
  try {
    // Admin protection
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert to buffer for Cloudinary upload_stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: UploadApiResponse = await new Promise(
      (resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder: "pagesandpeace/events",
            resource_type: "image",
            overwrite: false, // keep all event images
            transformation: [
              {
                width: 1200,
                height: 600,
                crop: "fill",
                gravity: "auto",
                quality: "auto",
              },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as UploadApiResponse);
          }
        );

        uploadStream.end(buffer);
      }
    );

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Image upload failed",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
