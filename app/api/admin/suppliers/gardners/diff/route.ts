export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function normalizeISBN(value: unknown): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9X]/gi, "").trim();
  if (cleaned.length < 10) return null;
  return cleaned.padStart(13, "0");
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    console.log("🟡 [DIFF] route hit");

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
       FORM DATA
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const batchId = formData.get("batch_id") as string | null;

    console.log("🟡 [DIFF] batchId", batchId);

    if (!file || !batchId) {
      return NextResponse.json(
        { error: "File and batch_id required" },
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

    console.log("🟡 [DIFF] rows parsed", rows.length);

    const normalized = rows
      .map((r) => {
        const supplier_ref = normalizeISBN(r["ISBN"]);
        const supplier_price = Number(r["PRICE"]);
        if (!supplier_ref || supplier_price <= 0) return null;
        return { supplier_ref, supplier_price };
      })
      .filter(Boolean) as { supplier_ref: string; supplier_price: number }[];

    console.log("🟡 [DIFF] normalized rows", normalized.length);

    /* -------------------------
       FETCH EXISTING
    ------------------------- */
    const { data: existing, error } = await supabase
      .from("supplier_products")
      .select("supplier_ref, supplier_price")
      .eq("supplier", "gardners");

    if (error) {
      console.error("❌ [DIFF] fetch failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const map = new Map<string, number>();
    for (const row of existing ?? []) {
      if (row.supplier_ref && row.supplier_price != null) {
        map.set(row.supplier_ref, Number(row.supplier_price));
      }
    }

    let newRecords = 0;
    let unchanged = 0;
    let priceChanges = 0;

    for (const row of normalized) {
      const old = map.get(row.supplier_ref);
      if (old === undefined) newRecords++;
      else if (old !== row.supplier_price) priceChanges++;
      else unchanged++;
    }

    console.log("🟢 [DIFF] result", {
      newRecords,
      priceChanges,
      unchanged,
    });

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
      console.error("❌ [DIFF] batch update failed", updateError);
      return NextResponse.json(
        { error: updateError.message },
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
    console.error("❌ [DIFF] fatal error", err);
    return NextResponse.json({ error: "Diff failed" }, { status: 500 });
  }
}
