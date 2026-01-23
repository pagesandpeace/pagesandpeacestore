export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  console.log("🟢 [AI DRAFT DESCRIPTION] route hit");

  const body = await req.json();
  console.log("🟢 [AI DRAFT DESCRIPTION] input:", body);

  const {
    name,
    author,
    isbn,
    format,
    language,
  } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const prompt = `
Write a high-quality product description for a book.

Title: ${name}
Author: ${author || "Unknown"}
Format: ${format || "Paperback"}
Language: ${language || "English"}
ISBN: ${isbn || "Unknown"}

Tone:
- Warm
- Literary
- Independent bookshop
- Concise but evocative

Avoid:
- Marketing clichés
- Overlong blurbs

Return only the description text.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text =
    completion.choices[0]?.message?.content?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "AI returned no content" },
      { status: 500 }
    );
  }

  return NextResponse.json({ description: text });
}
