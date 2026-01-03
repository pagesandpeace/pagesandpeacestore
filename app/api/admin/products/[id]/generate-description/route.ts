export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import OpenAI from "openai";

/* --------------------------------------------
   OpenAI client
-------------------------------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* --------------------------------------------
   Types
-------------------------------------------- */
type OpenLibraryEntry = {
  description?:
    | string
    | {
        value?: string;
      };
};

/* --------------------------------------------
   Helpers
-------------------------------------------- */
function extractOpenLibraryDescription(
  entry: OpenLibraryEntry | undefined
): string | null {
  if (!entry?.description) return null;

  if (typeof entry.description === "string") {
    return entry.description;
  }

  if (
    typeof entry.description === "object" &&
    typeof entry.description.value === "string"
  ) {
    return entry.description.value;
  }

  return null;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/* --------------------------------------------
   ROUTE
-------------------------------------------- */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
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
      .select(
        `
        id,
        name,
        display_title,
        author,
        isbn_13,
        format
      `
      )
      .eq("id", productId)
      .single();

    if (!product || !product.isbn_13) {
      return NextResponse.json(
        { error: "Product or ISBN missing" },
        { status: 400 }
      );
    }

    const isbn = product.isbn_13;
    let sourceText: string | null = null;
    let sourceUsed: "openlibrary" | "googlebooks" | "fallback" = "fallback";

    /* -------------------------
       1️⃣ OPEN LIBRARY
    ------------------------- */
    try {
      const olRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );

      if (olRes.ok) {
        const json = (await olRes.json()) as Record<
          string,
          OpenLibraryEntry
        >;

        const entry = json[`ISBN:${isbn}`];
        const desc = extractOpenLibraryDescription(entry);

        if (desc) {
          sourceText = clean(desc);
          sourceUsed = "openlibrary";
        }
      }
    } catch {
      // silently continue to next source
    }

    /* -------------------------
       2️⃣ GOOGLE BOOKS
    ------------------------- */
    if (!sourceText) {
      try {
        const gbRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
        );

        if (gbRes.ok) {
          const json = await gbRes.json();
          const desc: string | undefined =
            json.items?.[0]?.volumeInfo?.description;

          if (desc) {
            sourceText = clean(desc);
            sourceUsed = "googlebooks";
          }
        }
      } catch {
        // fallback next
      }
    }

    /* -------------------------
       AI PROMPT
    ------------------------- */
    const prompt = sourceText
  ? `
Rewrite the following book description in original words.

CRITICAL RULES:
- Output PLAIN TEXT ONLY
- Do NOT use markdown, asterisks, italics, or bold
- Do NOT include a title, author, or format header
- Write in paragraph form only
- It is acceptable to mention the book title naturally once in the prose
- Do NOT quote the source text
- Preserve factual meaning
- Use calm, neutral bookseller language
- 120–180 words
- No marketing clichés

Source text:
"""
${sourceText}
"""
`
  : `
Write a factual bookseller-style description.

CRITICAL RULES:
- Output PLAIN TEXT ONLY
- Do NOT use markdown, asterisks, italics, or bold
- Do NOT include a title, author, or format header
- Write in paragraph form only
- It is acceptable to mention the book title naturally once in the prose
- Do NOT invent plot details

Context:
Title: ${product.display_title ?? product.name}
Author: ${product.author ?? "Unknown"}
Format: ${product.format ?? "Book"}

Tone: literary, neutral
Length: 120–150 words
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You write accurate, restrained book descriptions for an independent bookshop.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const description =
      completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      description,
      source_used: sourceUsed,
    });
  } catch (err) {
    console.error("❌ generate-description failed:", err);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
