export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/* -------------------------------------------
   HELPERS
------------------------------------------- */

function normalizeISBN(value: unknown): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9X]/gi, "").trim();
  if (cleaned.length < 10) return null;
  return cleaned.padStart(13, "0");
}

/* -------------------------------------------
   ROUTE
------------------------------------------- */

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    console.log("🟡 [DIFF] Supabase client created");

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth, error: authError } = await supabase.auth.getUser();
    console.log("🟡 [DIFF] auth.getUser()", auth, authError);

    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    console.log("🟡 [DIFF] profile lookup", profile, profileError);

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       FORM DATA
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const batchId = formData.get("batch_id") as string | null;

    console.log("🟡 [DIFF] batchId", batchId);

    if (!file || !batchId) {
      return NextResponse.json(
        { error: "File and batch_id are required" },
        { status: 400 }
      );
    }

    /* -------------------------
       PARSE XLS
    ------------------------- */
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null,
    }) as Record<string, unknown>[];

    console.log("🟡 [DIFF] rows parsed:", rows.length);

    /* -------------------------
       NORMALISE INPUT
    ------------------------- */
    const normalized = rows
      .map((r) => {
        const supplier_ref = normalizeISBN(r["ISBN"]);
        const supplier_price = Number(r["PRICE"]);

        if (
          !supplier_ref ||
          !Number.isFinite(supplier_price) ||
          supplier_price <= 0
        ) {
          return null;
        }

        return { supplier_ref, supplier_price };
      })
      .filter(Boolean) as {
      supplier_ref: string;
      supplier_price: number;
    }[];

    console.log("🟡 [DIFF] normalized rows:", normalized.length);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found" },
        { status: 400 }
      );
    }

    /* -------------------------
       🔎 DEBUG: confirm table visibility
    ------------------------- */
    const { data: testRows, error: testError } = await supabase
      .from("supplier_products")
      .select("supplier_ref")
      .limit(1);

    console.log("🔎 [DIFF] supplier_products test SELECT:", {
      testRows,
      testError,
    });

    /* -------------------------
       FETCH EXISTING SUPPLIER PRODUCTS
       ✅ NO `.in()` — fetch all Gardners rows
    ------------------------- */
    const { data: existing, error: fetchError } = await supabase
      .from("supplier_products")
      .select("supplier_ref, supplier_price")
      .eq("supplier", "gardners");

    console.log(
      "🟡 [DIFF] supplier_products rows fetched:",
      existing?.length,
      fetchError
    );

    if (fetchError) {
      console.error("❌ supplier_products fetch failed:", fetchError);
      return NextResponse.json({ error: "Diff failed" }, { status: 500 });
    }

    /* -------------------------
       BUILD EXISTING MAP
    ------------------------- */
    const existingMap = new Map<string, number>();

    for (const row of existing || []) {
      if (row?.supplier_ref && row.supplier_price != null) {
        existingMap.set(
          String(row.supplier_ref),
          Number(row.supplier_price)
        );
      }
    }

    console.log("🟡 [DIFF] existingMap size:", existingMap.size);

    /* -------------------------
       DIFF
    ------------------------- */
    let newRecords = 0;
    let unchanged = 0;
    let priceChanges = 0;

    for (const row of normalized) {
      const oldPrice = existingMap.get(row.supplier_ref);

      if (oldPrice === undefined) newRecords++;
      else if (Number(oldPrice) !== Number(row.supplier_price))
        priceChanges++;
      else unchanged++;
    }

    console.log("🟢 [DIFF] result:", {
      newRecords,
      priceChanges,
      unchanged,
    });

    /* -------------------------
       UPDATE IMPORT BATCH
    ------------------------- */
    const { error: updateError } = await supabase
      .from("supplier_import_batches")
      .update({
        valid_rows: normalized.length,
        new_records: newRecords,
        unchanged_records: unchanged,
        price_changes: priceChanges,
        status: "diffed",
        diffed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (updateError) {
      console.error("❌ Batch update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to update batch" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid_rows: normalized.length,
      new_records: newRecords,
      unchanged,
      price_changes: priceChanges,
    });
  } catch (err) {
    console.error("❌ GARDNERS DIFF FAILED:", err);
    return NextResponse.json({ error: "Diff failed" }, { status: 500 });
  }
}