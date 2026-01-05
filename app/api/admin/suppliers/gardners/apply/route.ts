export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
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

function normalizeTitle(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*),\s*(The|A|An)$/i);
  if (!match) return trimmed;
  const [, title, article] = match;
  return `${article} ${title}`.trim();
}

function normalizeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------
   ROUTE
------------------------------------------- */

export async function POST(req: Request) {
  try {
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
       ADMIN CLIENT
    ------------------------- */
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* -------------------------
       FORM DATA
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const batchId = formData.get("batch_id") as string | null;

    if (!file || !batchId) {
      return NextResponse.json(
        { error: "file and batch_id are required" },
        { status: 400 }
      );
    }

    /* -------------------------
       VERIFY BATCH
    ------------------------- */
    const { data: batch } = await supabaseAdmin
      .from("supplier_import_batches")
      .select("uploaded_at, status")
      .eq("id", batchId)
      .single();

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

    const importMonth =
      new Date(batch.uploaded_at).toISOString().slice(0, 7) + "-01";

    /* -------------------------
       NORMALISE
    ------------------------- */
    const normalized = rows
      .map((r) => {
        const isbn = normalizeISBN(r["ISBN"]);
        const price = Number(r["PRICE"]);

        if (!isbn || !Number.isFinite(price) || price <= 0) return null;

        return {
          supplier_ref: isbn,
          title: String(r["TITLE"] || "").trim(),
          display_title: normalizeTitle(String(r["TITLE"] || "")),
          author: r["AUTHOR"] ? String(r["AUTHOR"]).trim() : null,
          supplier_price: price,
          binding: r["BINDING"] ? String(r["BINDING"]).trim() : null,
          rank_pos: normalizeNumber(r["POS"]),
          rank_prev_pos: normalizeNumber(r["POSITION -1Wk"]),
        };
      })
      .filter(Boolean) as {
      supplier_ref: string;
      title: string;
      display_title: string;
      author: string | null;
      supplier_price: number;
      binding: string | null;
      rank_pos: number | null;
      rank_prev_pos: number | null;
    }[];

    /* -------------------------
       UPSERT supplier_products
    ------------------------- */
    await supabaseAdmin.from("supplier_products").upsert(
      normalized.map((n) => ({
        supplier: "gardners",
        supplier_ref: n.supplier_ref,
        title: n.title,
        display_title: n.display_title,
        author: n.author,
        supplier_price: n.supplier_price,
        binding: n.binding,
        rank_pos: n.rank_pos,
        rank_prev_pos: n.rank_prev_pos,
        import_batch_id: batchId,
        import_month: importMonth,
        snapshot_month: importMonth,
        supplier_last_updated: new Date().toISOString(),
      })),
      { onConflict: "supplier,supplier_ref" }
    );

    /* -------------------------
       FETCH LINKED PRODUCTS
    ------------------------- */
    const { data: links } = await supabaseAdmin
      .from("product_supplier_links")
      .select("product_id, supplier_ref")
      .eq("supplier", "gardners");

    const linkMap = new Map(
      links?.map((l) => [l.supplier_ref, l.product_id]) ?? []
    );

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, isbn_13, supplier_price")
      .eq("supplier_name", "gardners");

    const productMap = new Map<string, any>();
    for (const p of products ?? []) {
      if (p.isbn_13) productMap.set(p.isbn_13, p);
    }

    /* -------------------------
       UPDATE PRODUCT SUPPLIER SNAPSHOT
       + DETECT CHANGES
    ------------------------- */
    for (const n of normalized) {
      const product = productMap.get(n.supplier_ref);
      if (!product) continue;

      // Always update supplier snapshot
      await supabaseAdmin
        .from("products")
        .update({
          supplier_price: n.supplier_price,
          supplier_last_updated: new Date().toISOString(),
        })
        .eq("id", product.id);

      // Detect price change
      if (Number(product.supplier_price) !== Number(n.supplier_price)) {
        const { data: existing } = await supabaseAdmin
          .from("supplier_changes")
          .select("id")
          .eq("product_id", product.id)
          .eq("field", "supplier_price")
          .eq("status", "pending")
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from("supplier_changes").insert({
            product_id: product.id,
            supplier: "gardners",
            field: "supplier_price",
            old_value: String(product.supplier_price),
            new_value: String(n.supplier_price),
          });
        }
      }
    }

    /* -------------------------
       UPDATE PRODUCT RANKINGS (MONTHLY SNAPSHOT)
    ------------------------- */
    const rankingRows = normalized
      .map((n) => {
        const productId = linkMap.get(n.supplier_ref);
        if (!productId || !n.rank_pos) return null;

        return {
          product_id: productId,
          isbn_13: n.supplier_ref,
          supplier_name: "gardners",
          rank: n.rank_pos,
          import_month: importMonth,
        };
      })
      .filter(Boolean);

    if (rankingRows.length) {
      await supabaseAdmin
        .from("product_rankings")
        .delete()
        .eq("supplier_name", "gardners")
        .eq("import_month", importMonth);

      await supabaseAdmin.from("product_rankings").insert(rankingRows);
    }

    /* -------------------------
       FINALISE BATCH
    ------------------------- */
    await supabaseAdmin
      .from("supplier_import_batches")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return NextResponse.json({
      batch_id: batchId,
      rankings_updated: rankingRows.length,
    });
  } catch (err) {
    console.error("❌ GARDNERS APPLY FAILED:", err);
    return NextResponse.json(
      { error: "Failed to apply Gardners import" },
      { status: 500 }
    );
  }
}
