export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const TABLE_MAP = {
  genre: "genres",
  vibe: "vibes",
  theme: "themes",
} as const;

type ClassificationType = keyof typeof TABLE_MAP;

export async function POST(req: NextRequest) {
  console.log("🟢 CREATE CLASSIFICATION ROUTE HIT");

  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth, error: authErr } =
      await supabase.auth.getUser();

    console.log("👤 AUTH:", auth?.user?.id, authErr);

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileErr } =
      await supabase
        .from("users")
        .select("role")
        .eq("auth_user_id", auth.user.id)
        .single();

    console.log("🛂 PROFILE:", profile, profileErr);

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
    console.log("📦 BODY RECEIVED:", body);

    const { type, name } = body as {
      type?: ClassificationType;
      name?: string;
    };

    if (!type || !name) {
      return NextResponse.json(
        { error: "Missing type or name" },
        { status: 400 }
      );
    }

    if (!TABLE_MAP[type]) {
      return NextResponse.json(
        { error: "Invalid classification type" },
        { status: 400 }
      );
    }

    const table = TABLE_MAP[type];
    const cleanName = name.trim();

    console.log("📌 INSERT INTO:", table, "NAME:", cleanName);

    if (!cleanName) {
      return NextResponse.json(
        { error: "Empty name" },
        { status: 400 }
      );
    }

    /* -------------------------
       INSERT
    ------------------------- */
    const { data, error } = await supabase
      .from(table)
      .insert({ name: cleanName })
      .select("id, name")
      .single();

    console.log("📥 INSERT RESULT:", data, error);

    if (error) {
      if (error.code === "23505") {
        console.log("♻️ DUPLICATE — fetching existing");

        const { data: existing, error: fetchErr } =
          await supabase
            .from(table)
            .select("id, name")
            .ilike("name", cleanName)
            .single();

        console.log("📦 EXISTING:", existing, fetchErr);

        if (existing) {
          return NextResponse.json(existing);
        }
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("💥 CREATE CLASSIFICATION ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
