export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/* ------------------------------------------
   CONFIG
------------------------------------------ */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* ------------------------------------------
   ROUTE
------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    console.log("🟢 [AI AUTHOR SUGGESTION] route hit");

    const body = await req.json();
    console.log("🟢 [AI AUTHOR SUGGESTION] body:", body);

    const { name, description, isbn } = body;

    if (!name && !isbn) {
      return NextResponse.json(
        { error: "Title or ISBN required" },
        { status: 400 }
      );
    }

    /* ------------------------------------------
       PROMPT
    ------------------------------------------ */

    const prompt = `
You are helping a bookshop admin.

Given the following information, identify the most likely author.

Rules:
- Return ONLY the author's name
- Do not include extra text
- If uncertain, make your best educated guess
- Never invent fictional authors

Data:
Title: ${name || "Unknown"}
Description: ${description || "None"}
ISBN: ${isbn || "None"}
`;

    /* ------------------------------------------
       OPENAI CALL
    ------------------------------------------ */

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract structured bibliographic data for a book retailer.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const author =
      completion.choices[0]?.message?.content?.trim() || null;

    if (!author) {
      return NextResponse.json(
        { error: "No author identified" },
        { status: 404 }
      );
    }

    console.log("🟢 [AI AUTHOR SUGGESTION] author:", author);

    return NextResponse.json({
      author,
      reason: isbn
        ? "Identified via ISBN metadata"
        : "Inferred from title and description",
    });
  } catch (err) {
    console.error("🔥 [AI AUTHOR SUGGESTION] failed:", err);
    return NextResponse.json(
      { error: "AI author suggestion failed" },
      { status: 500 }
    );
  }
}
