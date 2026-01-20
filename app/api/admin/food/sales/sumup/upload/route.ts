import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------
   ADMIN CLIENT
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function safeNumber(value: unknown, fallback = 0): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  return Number.isFinite(n) ? n : fallback;
}

function parseUkDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const v = value.trim();
  if (!v) return null;

  // Expected format: "7 Nov 2025, 14:54"
  const [datePart, timePart] = v.split(",");
  if (!datePart || !timePart) return null;

  const [dayStr, monthStr, yearStr] = datePart.trim().split(" ");

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const day = Number(dayStr);
  const month = monthMap[monthStr];
  const year = Number(yearStr);

  if (!day || month === undefined || !year) return null;

  const [hour = 0, minute = 0] =
    timePart.trim().split(":").map(Number);

  // Europe/London local time → JS Date
  return new Date(year, month, day, hour, minute);
}

/* ---------------------------------------------
   POST — SUMUP CSV → fd.sales_events
--------------------------------------------- */

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧾 [SUMUP SALES IMPORT → fd.sales_events]");

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing CSV file" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    console.log(`📄 Parsed ${records.length} CSV rows`);

    const importId = crypto.randomUUID();

    const rows = records
      .map((row, idx) => {
        const soldAt = parseUkDate(row["Date"]);

        if (!soldAt) {
          console.warn(`⚠️ Row ${idx + 1}: invalid date`, row);
          return null;
        }

        const saleDay = soldAt.toLocaleDateString("en-CA", {
          timeZone: "Europe/London",
        });

        return {
          source: "sumup",
          source_ref: row["Transaction ID"] ?? null,

          sold_at: soldAt.toISOString(),
          sale_day: saleDay,

          raw_name: row["Description"]?.trim() || "Unknown item",
          quantity: safeNumber(row["Quantity"], 1),

          gross_amount_pence: Math.round(
            safeNumber(row["Price (Gross)"], 0) * 100
          ),

          currency: row["Currency"] || "GBP",
          import_id: importId,
        };
      })
      .filter(
        (r): r is NonNullable<typeof r> => r !== null
      );

    if (!rows.length) {
      return NextResponse.json(
        { error: "No valid rows found in CSV" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------
       UPSERT (IDEMPOTENT)
    --------------------------------------------- */

    const { error } = await supabaseAdmin
      .from("sales_events")
      .upsert(rows, {
        onConflict:
          "source,source_ref,sold_at,raw_name,quantity",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("🟥 UPSERT ERROR", error);
      throw error;
    }

    console.log(`✅ Processed ${rows.length} sales events`);

    return NextResponse.json({
      success: true,
      rows_processed: rows.length,
      import_id: importId,
    });
  } catch (err) {
    console.error("🟥 Import failed", err);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
