/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

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
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [API] PATCH /api/user/avatar");

  try {
    /* ----------------------------------------
       AUTH
    ---------------------------------------- */
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    console.log("👤 Auth:", {
      id: auth?.user?.id,
      email: auth?.user?.email,
      error: authErr,
    });

    if (authErr || !auth?.user) {
      console.warn("🚫 Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ----------------------------------------
       FILE PARSE
    ---------------------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    console.log("📄 File:", {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    });

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    /* ----------------------------------------
       CLOUDINARY UPLOAD
    ---------------------------------------- */
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    console.log("☁️ Uploading to Cloudinary…");

    const upload = await cloudinary.v2.uploader.upload(dataUri, {
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

    console.log("✅ Cloudinary URL:", upload.secure_url);

    /* ----------------------------------------
       DATABASE UPDATE (CRITICAL PART)
    ---------------------------------------- */
    const { data, error } = await supabase
      .from("users")
      .update({
        image: upload.secure_url,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", auth.user.id)
      .select("id, image");

    console.log("🧪 DB UPDATE RESULT:", { data, error });

    if (error || !data || data.length === 0) {
      console.error("💥 Avatar update FAILED");
      return NextResponse.json(
        { error: "Avatar not persisted" },
        { status: 500 }
      );
    }

    console.log("🎉 Avatar persisted for:", auth.user.email);

    return NextResponse.json({
      success: true,
      imageUrl: upload.secure_url,
    });
  } catch (err: any) {
    console.error("🔥 Avatar upload crashed:", err);
    return NextResponse.json(
      { error: "Avatar upload failed", details: err?.message },
      { status: 500 }
    );
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
