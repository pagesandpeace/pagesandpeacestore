export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

/* --------------------------------------------------
   Cloudinary config
-------------------------------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* --------------------------------------------------
   POST /api/admin/upload-image
-------------------------------------------------- */
export async function POST(req: Request) {
  try {
    console.log("🖼 Incoming: IMAGE UPLOAD");

    /* -----------------------------
       AUTH (admin only)
    ----------------------------- */
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -----------------------------
       READ FORM DATA
    ----------------------------- */
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    /* -----------------------------
       CONVERT TO BUFFER
    ----------------------------- */
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* -----------------------------
       UPLOAD TO CLOUDINARY
    ----------------------------- */
    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "products",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (!result) {
                reject(new Error("No upload result returned"));
              } else {
                resolve(result);
              }
            }
          )
          .end(buffer);
      }
    );

    console.log("✅ Uploaded image:", uploadResult.secure_url);

    /* -----------------------------
       RESPONSE
    ----------------------------- */
    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (err) {
    console.error("🔥 IMAGE UPLOAD FAILED:", err);
    return NextResponse.json(
      { error: "Server error uploading image" },
      { status: 500 }
    );
  }
}
