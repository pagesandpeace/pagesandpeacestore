import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming update author request...");

    const body = await req.json();
    console.log("📥 Payload received:", body);

    const {
      id,
      name,
      slug,
      short_bio,
      bio,
      profile_image_url,
    } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = supabaseService();

    const finalSlug =
      slug?.trim() ||
      slugify(name, { lower: true, strict: true }) +
        "-" +
        Date.now().toString().slice(-6);

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      short_bio: short_bio || null,
      bio: bio || null,
      profile_image_url: profile_image_url || null,
      updated_at: new Date().toISOString(),
    };

    console.log("✍️ Updating author:", payload);

    const { data: author, error } = await supabase
      .from("authors")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ AUTHOR UPDATE ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Author updated:", author);

    return NextResponse.json({ success: true, author });
  } catch (err) {
    console.error("🔥 Update author route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
