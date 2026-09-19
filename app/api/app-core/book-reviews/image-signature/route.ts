import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a review photo." }, { status: 401 });

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `pages-and-peace/book-reviews/${user.id}/${crypto.randomUUID()}`;
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    publicId,
    timestamp,
    signature,
  }, { headers: { "Cache-Control": "no-store" } });
}
