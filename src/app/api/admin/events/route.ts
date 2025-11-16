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
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: UploadApiResponse = await new Promise(
      (resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder: "pagesandpeace/events",
            resource_type: "image",
            overwrite: false,

            // ⭐ OPTIMISED EVENT TRANSFORM
            transformation: [
              {
                width: 1500,
                height: 844,
                crop: "fill",
                gravity: "auto",
                fetch_format: "auto",
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

    // ⭐ Clean canonical URL (no versioning junk)
    const optimizedUrl = uploadResult.secure_url.replace(
      "/upload/",
      "/upload/f_auto,q_auto,c_fill,w_1500,h_844/"
    );

    return NextResponse.json({
      success: true,
      url: optimizedUrl,
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
