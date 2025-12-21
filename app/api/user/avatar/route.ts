/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function PATCH(req: Request) {
  console.log("📥 [API] PATCH /api/user/avatar called");

  try {
    // Get authenticated user via Supabase server client
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    console.log("🧠 [API] Supabase auth:", auth?.user?.email || "no user");

    if (authErr || !auth?.user) {
      console.warn("🚫 [API] Not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    console.log("📄 [API] file:", file?.name, file?.size);

    if (!file) {
      console.error("❌ [API] No file uploaded");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file → base64 for Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    console.log("⚙️ [API] Uploading to Cloudinary...");

    // Upload to Cloudinary (safe in Next.js API routes)
    const uploadResult = await cloudinary.v2.uploader.upload(dataUri, {
      folder: `pagesandpeace/avatars/${auth.user.id}`,
      public_id: "avatar",
      overwrite: true,
      resource_type: "image",
      transformation: [
        {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "auto",
          quality: "auto",
        },
      ],
    });

    console.log("✅ [API] Cloudinary upload success:", uploadResult.secure_url);

    // Save avatar URL to Supabase users table
    const { error: updateError } = await supabase
      .from("users")
      .update({
        image: uploadResult.secure_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (updateError) {
      console.error("💥 [API] Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed updating user" },
        { status: 500 }
      );
    }

    console.log(`🎉 [API] Avatar updated for ${auth.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Avatar updated successfully",
      imageUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    console.error("💥 [API] Avatar upload failed:", error);
    return NextResponse.json(
      { error: "Avatar upload failed", details: error.message || error },
      { status: 500 }
    );
  }
}
