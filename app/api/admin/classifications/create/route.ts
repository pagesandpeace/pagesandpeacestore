export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import slugify from "slugify";

const TABLE_MAP = {
  genre: "genres",
  vibe: "vibes",
  theme: "themes",
} as const;

type ClassificationType = keyof typeof TABLE_MAP;

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
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
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       BODY
    ------------------------- */
    const body = await req.json();

    const {
      type,
      name,
      description,
    }: {
      type?: ClassificationType;
      name?: string;
      description?: string | null;
    } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Missing type or name" },
        { status: 400 }
      );
    }

    const table = TABLE_MAP[type];
    if (!table) {
      return NextResponse.json(
        { error: "Invalid classification type" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    if (!cleanName) {
      return NextResponse.json(
        { error: "Empty name" },
        { status: 400 }
      );
    }

    const normalized = cleanName.toLowerCase();

    /* -------------------------
       CHECK EXISTING (STRICT)
    ------------------------- */
    const { data: existing } = await supabase
      .from(table)
      .select("id, name, description")
      .ilike("name", normalized)
      .maybeSingle();

    // ✅ If it already exists, RETURN IT — DO NOT MUTATE
    if (existing) {
      return NextResponse.json(existing);
    }

    /* -------------------------
       INSERT (AI-SAFE)
    ------------------------- */
    const insertPayload: Record<string, unknown> = {
      name: cleanName,
    };

    // slug ID for genres
    if (type === "genre") {
      insertPayload.id = slugify(cleanName, {
        lower: true,
        strict: true,
      });
    }

    // AI suggestions MUST persist description
    if (description && description.trim()) {
      insertPayload.description = description.trim();
    }

    const { data, error } = await supabase
      .from(table)
      .insert(insertPayload)
      .select("id, name, description")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("CREATE CLASSIFICATION ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
