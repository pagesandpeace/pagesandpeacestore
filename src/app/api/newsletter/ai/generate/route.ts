import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------------------------------------
   OPENAI CLIENT
-------------------------------------------------------- */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* --------------------------------------------------------
   BRAND VOICE
-------------------------------------------------------- */

const BRAND_VOICE = `
You speak in the Pages & Peace tone:

- warm
- whimsical
- community-driven
- soft & slow
- modern minimal with rustic touches
- inclusive, friendly, never corporate
- no high-brow literary language
- no salesy or pushy commercial tone
- your philosophy: “books are lost worlds waiting to be discovered.”

Your style:
- cosy, gentle poetry
- soft humour
- grounded, human, calming
- feels handwritten, personal, inviting

Forbidden:
- aggressive marketing
- "corporate newsletter voice"
- over-the-top hype
- elitist language
`;

/* --------------------------------------------------------
   FEATURE PANELS
-------------------------------------------------------- */

function PANEL_BOOKS() {
  return `
<div style="padding:16px; background:#FAF6F1; border-radius:8px; margin:20px 0;">
  <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:600;">Book Recommendations</h2>
  <p style="margin:0; font-size:15px; line-height:1.6;">
    Here are a few quiet worlds worth wandering into this week…
  </p>
</div>
`.trim();
}

function PANEL_DIGITAL_TWIN() {
  return `
<div style="padding:16px; background:#F7F3EC; border-radius:8px; margin:20px 0;">
  <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:600;">Your Reading Twin</h2>
  <p style="margin:0; font-size:15px; line-height:1.6;">
    A gentle reflection written just for the reader — something soft, curious, a little whimsical.
  </p>
</div>
`.trim();
}

function PANEL_JOKE() {
  return `
<div style="padding:16px; background:#FFF8E8; border-radius:8px; margin:20px 0;">
  <p style="margin:0; font-size:15px; line-height:1.6;">
    <strong>Bookish Joke:</strong><br/>
    Why did the book join the Pages & Peace café?<br/>
    It wanted to be part of the binding community.
  </p>
</div>
`.trim();
}

function PANEL_LOYALTY() {
  return `
<div style="padding:16px; background:#EFFCF2; border-radius:8px; margin:20px 0;">
  <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:600;">Loyalty Corner</h2>
  <p style="margin:0; font-size:15px; line-height:1.6;">
    Our loyalty club is for people who enjoy slow mornings, fresh books, and quiet corners of the world.
  </p>
</div>
`.trim();
}

function PANEL_COMMUNITY() {
  return `
<div style="padding:16px; background:#F0F7FF; border-radius:8px; margin:20px 0;">
  <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:600;">Community Corner</h2>
  <p style="margin:0; font-size:15px; line-height:1.6;">
    Little moments from the shop this week — the ones that make Pages & Peace feel like home.
  </p>
</div>
`.trim();
}

/* --------------------------------------------------------
   MAIN ROUTE
-------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const { mode, content, panelType, category = "general" } = await req.json();
    // ^ category is accepted (no immediate use yet)

    if (!mode) {
      return NextResponse.json(
        { ok: false, error: "Missing mode parameter" },
        { status: 400 }
      );
    }

    /* ----------------------------------------------
       MODE: TEST
    ---------------------------------------------- */
    if (mode === "test") {
      return NextResponse.json({
        ok: true,
        message: "AI route reached successfully",
        content,
      });
    }

    /* ----------------------------------------------
       MODE: PANEL INSERTION
    ---------------------------------------------- */
    if (mode === "panel") {
      let block = "";

      switch (panelType) {
        case "books":
          block = PANEL_BOOKS();
          break;
        case "digital-twin":
          block = PANEL_DIGITAL_TWIN();
          break;
        case "joke":
          block = PANEL_JOKE();
          break;
        case "loyalty":
          block = PANEL_LOYALTY();
          break;
        case "community":
          block = PANEL_COMMUNITY();
          break;
        default:
          return NextResponse.json(
            { ok: false, error: "Unknown panel type" },
            { status: 400 }
          );
      }

      return NextResponse.json({ ok: true, block });
    }

    /* ----------------------------------------------
       MODE: FULL DRAFT
    ---------------------------------------------- */
    if (mode === "full-draft") {
      const prompt = `
Write a full Pages & Peace newsletter in HTML format.

${BRAND_VOICE}

Structure:
- warm opening
- gentle reflection about reading or community
- optional soft nudge about events (generic, not specific)
- optional bookish or cosy café moment
- warm closing

Return ONLY HTML.
`;

      const result = await client.responses.create({
        model: "gpt-4.1",
        input: prompt,
      });

      const text = result.output_text || "";
      return NextResponse.json({ ok: true, result: text });
    }

    /* ----------------------------------------------
       MODE: TRANSFORMATIONS
    ---------------------------------------------- */
    if (["shorten", "lengthen", "pp-voice", "softer", "whimsical"].includes(mode)) {
      const prompt = `
Transform this content in HTML.

${BRAND_VOICE}

Task: ${mode}
Content:
${content}

Return ONLY the transformed HTML.
`;

      const result = await client.responses.create({
        model: "gpt-4.1",
        input: prompt,
      });

      return NextResponse.json({
        ok: true,
        result: result.output_text || "",
      });
    }

    /* ----------------------------------------------
       UNKNOWN MODE
    ---------------------------------------------- */
    return NextResponse.json(
      { ok: false, error: "Unknown mode" },
      { status: 400 }
    );

  } catch (err: unknown) {
    const errorMessage =
      typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";

    console.error("AI generate error:", errorMessage);

    return NextResponse.json(
      { ok: false, error: "Internal AI error" },
      { status: 500 }
    );
  }
}
