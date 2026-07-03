import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming create author request...");

    /* --------------------------------------------------
       1) Require admin before using service role
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /* --------------------------------------------------
       2) Parse payload
    -------------------------------------------------- */
    const body = await req.json();
    console.log("📥 Payload received:", body);

    const { name, slug, short_bio, bio, profile_image_url } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Author name is required." },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       3) Use service role only after admin check
    -------------------------------------------------- */
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
    };

    console.log("✍️ Inserting author:", payload);

    const { data: author, error } = await supabase
      .from("authors")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("❌ AUTHOR INSERT ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Author created:", author);

    return NextResponse.json({ success: true, author });
  } catch (err) {
    console.error("🔥 Create author route crashed:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}