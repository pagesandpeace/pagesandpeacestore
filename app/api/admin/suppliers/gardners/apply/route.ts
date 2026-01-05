export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
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
    console.log("🟡 [APPLY] route hit");

    const supabaseUser = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabaseUser.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabaseUser
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       SERVICE ROLE
    ------------------------- */
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    console.log("🟡 [APPLY] service role client created");

    /* -------------------------
       FORM DATA
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const batchId = formData.get("batch_id") as string | null;

    if (!file || !batchId) {
      return NextResponse.json(
        { error: "file and batch_id required" },
        { status: 400 }
      );
    }

    /* -------------------------
       VERIFY BATCH
    ------------------------- */
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("supplier_import_batches")
      .select("uploaded_at, status")
      .eq("id", batchId)
      .single();

    console.log("🟡 [APPLY] batch", batch, batchError);

    if (!batch || batch.status !== "diffed") {
      return NextResponse.json(
        { error: "Batch must be diffed before apply" },
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

    console.log("🟡 [APPLY] rows parsed", rows.length);

    const importMonth =
      new Date(batch.uploaded_at).toISOString().slice(0, 7) + "-01";

    const normalized = rows
      .map((r) => {
        const isbn = normalizeISBN(r["ISBN"]);
        const price = Number(r["PRICE"]);
        if (!isbn || price <= 0) return null;
        return {
          supplier_ref: isbn,
          supplier_price: price,
        };
      })
      .filter(Boolean) as { supplier_ref: string; supplier_price: number }[];

    console.log("🟡 [APPLY] normalized", normalized.length);

    /* -------------------------
       UPSERT SUPPLIER PRODUCTS
    ------------------------- */
    const { error: upsertError } = await supabaseAdmin
      .from("supplier_products")
      .upsert(
        normalized.map((n) => ({
          supplier: "gardners",
          supplier_ref: n.supplier_ref,
          supplier_price: n.supplier_price,
          import_batch_id: batchId,
          import_month: importMonth,
          snapshot_month: importMonth,
          supplier_last_updated: new Date().toISOString(),
        })),
        { onConflict: "supplier,supplier_ref" }
      );

    if (upsertError) {
      console.error("❌ [APPLY] upsert failed", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    console.log("🟢 [APPLY] supplier_products upserted");

    /* -------------------------
       FINALISE
    ------------------------- */
    const { error: finalError } = await supabaseAdmin
      .from("supplier_import_batches")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (finalError) {
      console.error("❌ [APPLY] batch finalise failed", finalError);
      return NextResponse.json(
        { error: finalError.message },
        { status: 500 }
      );
    }

    console.log("🟢 [APPLY] batch finalised");

    return NextResponse.json({ batch_id: batchId });
  } catch (err) {
    console.error("❌ [APPLY] fatal error", err);
    return NextResponse.json(
      { error: "Failed to apply Gardners import" },
      { status: 500 }
    );
  }
}
