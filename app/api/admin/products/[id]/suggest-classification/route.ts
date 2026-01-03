export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import OpenAI from "openai";

/* --------------------------------------------
   OpenAI
-------------------------------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* --------------------------------------------
   TYPES
-------------------------------------------- */
type OpenLibrarySubject = {
  name: string;
};

type OpenLibraryEntry = {
  subjects?: OpenLibrarySubject[];
};

type OpenLibraryResponse = Record<string, OpenLibraryEntry>;

/* --------------------------------------------
   Helpers
-------------------------------------------- */
function extractJson(raw: string): string {
  const noFences = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = noFences.indexOf("{");
  const lastBrace = noFences.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    return noFences.slice(firstBrace, lastBrace + 1);
  }

  return noFences;
}

/* --------------------------------------------
   Route
-------------------------------------------- */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       PRODUCT
    ------------------------- */
    const { data: product } = await supabase
      .from("products")
      .select("name, display_title, description, author, isbn_13")
      .eq("id", id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    /* -------------------------
       OPEN LIBRARY SUBJECTS
    ------------------------- */
    let subjects: string[] = [];

    if (product.isbn_13) {
      try {
        const res = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${product.isbn_13}&format=json&jscmd=data`
        );

        if (res.ok) {
          const json = (await res.json()) as OpenLibraryResponse;
          const entry = json[`ISBN:${product.isbn_13}`];

          if (entry?.subjects) {
            subjects = entry.subjects.map((s) => s.name);
          }
        }
      } catch (e) {
        console.warn("⚠️ Open Library fetch failed:", e);
      }
    }

    /* -------------------------
       AI PROMPT
    ------------------------- */
    const prompt = `
You are assisting a bookseller.

Suggest:
- ONE genre
- ONE vibe
- ONE theme

Rules:
- Use short labels (1–3 words)
- Do NOT include markdown
- Respond with JSON ONLY

Return exactly:

{
  "genre": { "value": string, "reason": string },
  "vibe": { "value": string, "reason": string },
  "theme": { "value": string, "reason": string }
}

DATA:
Title: ${product.display_title ?? product.name}
Author: ${product.author ?? "Unknown"}
Description: ${product.description ?? "None"}
Subjects: ${subjects.join(", ") || "None"}
`;

    /* -------------------------
       OPENAI CALL
    ------------------------- */
    let raw = "";

    try {
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.3,
      });

      raw = response.output_text ?? "";
    } catch (e) {
      console.error("❌ OpenAI failed:", e);
      return NextResponse.json({ error: "AI failed" }, { status: 500 });
    }

    /* -------------------------
       PARSE
    ------------------------- */
    try {
      const cleaned = extractJson(raw);
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      console.error("❌ AI JSON parse failed");
      console.error("RAW:", raw);
      return NextResponse.json(
        { error: "Failed to parse AI suggestions" },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("💥 Route crashed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
