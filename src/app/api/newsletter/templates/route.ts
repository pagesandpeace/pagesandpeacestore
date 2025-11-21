import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(emailTemplates);
  return NextResponse.json({ ok: true, templates: rows });
}
export async function POST(req: Request) {
  const { name, subject, body, category } = await req.json();

  await db.insert(emailTemplates).values({
    name,
    subject,
    body,
    category: category || "general",
  });

  return NextResponse.json({ ok: true });
}

