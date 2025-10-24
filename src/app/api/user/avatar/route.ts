/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import cloudinary from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

// ✅ Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function PATCH(request: Request) {
  console.log("📥 [API] PATCH /api/user/avatar called");
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    console.log("🧠 [API] Session result:", session?.user?.email || "no session");
    if (!session?.user) {
      console.warn("🚫 [API] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    console.log("📄 [API] File received:", file?.name, file?.size);

    if (!file) {
      console.error("❌ [API] No file uploaded");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("⚙️ [API] Uploading to Cloudinary...");

    const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder: `pagesandpeace/avatars/${session.user.id}`,
          public_id: "avatar",
          overwrite: true,
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "auto", quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("💥 [API] Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("✅ [API] Cloudinary upload success:", result?.secure_url);
            resolve(result as UploadApiResponse);
          }
        }
      );
      uploadStream.end(buffer);
    });

    console.log("📝 [API] Updating DB with image URL:", uploadResult.secure_url);
    await db
      .update(users)
      .set({ image: uploadResult.secure_url })
      .where(eq(users.id, session.user.id));

    console.log(`✅ [API] Avatar updated for ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Avatar updated successfully",
      imageUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    console.error("❌ [API] Avatar upload failed:", error);
    return NextResponse.json(
      { error: "Avatar upload failed", details: error.message || error },
      { status: 500 }
    );
  }
}
