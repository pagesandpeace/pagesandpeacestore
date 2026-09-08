/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function PATCH(req: Request) {
  try {
    const auth = await supabaseAuthServer();
    const { data: { user }, error: authErr } = await auth.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const upload = await cloudinary.v2.uploader.upload(dataUri, {
      folder: `pagesandpeace/avatars/${user.id}`,
      public_id: "avatar",
      overwrite: true,
      resource_type: "image",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "auto", quality: "auto" }],
    });

    const { error } = await supabaseService().schema("app_core").from("customers")
      .update({ profile_image: upload.secure_url, updated_at: new Date().toISOString() })
      .eq("auth_user_id", user.id);
    if (error) return NextResponse.json({ error: "Avatar not persisted" }, { status: 500 });

    return NextResponse.json({ success: true, imageUrl: upload.secure_url });
  } catch (err: any) {
    console.error("Avatar upload failed", { message: err?.message });
    return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 });
  }
}
