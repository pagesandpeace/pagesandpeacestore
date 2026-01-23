export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  console.log("🟢 [AI DRAFT CLASSIFICATION] route hit");

  const body = await req.json();
  console.log("🟢 [AI DRAFT CLASSIFICATION] input:", body);

  const { name, description } = body;

  if (!name || !description) {
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 }
    );
  }

  const prompt = `
You are classifying a product for an independent bookshop.

Given the product details below, suggest:
1. A genre
2. A vibe
3. A theme

Each suggestion must include:
- value: a short label (1–3 words)
- reason: a one-sentence explanation

Product:
Title: ${name}
Description:
${description}

Return STRICT JSON in this exact shape:

{
  "genre": { "value": "...", "reason": "..." },
  "vibe": { "value": "...", "reason": "..." },
  "theme": { "value": "...", "reason": "..." }
}

No markdown. No commentary.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    return NextResponse.json(
      { error: "AI returned no content" },
      { status: 500 }
    );
  }

  try {
    const parsed = JSON.parse(raw);
    console.log("🟢 [AI DRAFT CLASSIFICATION] output:", parsed);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("🔴 [AI DRAFT CLASSIFICATION] JSON parse failed:", raw);
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 500 }
    );
  }
}
