export const runtime = "nodejs";

import * as XLSX from "xlsx";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("🟢 [GARDNERS UPLOAD] route hit");

  try {
    const supabase = await supabaseServer();
    console.log("🟢 [SUPABASE] client initialised");

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth, error: authError } = await supabase.auth.getUser();

    console.log("🟢 [AUTH] result:", {
      userId: auth?.user?.id ?? null,
      error: authError ?? null,
    });

    if (!auth?.user) {
      console.error("❌ [AUTH] no user");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    console.log("🟢 [PROFILE] lookup:", {
      profile,
      error: profileError ?? null,
    });

    if (profileError || !profile || profile.role !== "admin") {
      console.error("❌ [AUTHZ] admin check failed", {
        profile,
        error: profileError ?? null,
      });

      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       FILE
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    console.log("🟢 [FILE] received:", {
      hasFile: Boolean(file),
      filename: file?.name ?? null,
      size: file?.size ?? null,
      type: file?.type ?? null,
    });

    if (!file) {
      console.error("❌ [FILE] missing");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("🟢 [FILE] buffer length:", buffer.length);

    /* -------------------------
       HASH
    ------------------------- */
    const fileHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    console.log("🟢 [HASH] sha256:", fileHash);

    /* -------------------------
       PARSE XLS
    ------------------------- */
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log("🟢 [XLS] parsed sheet:", {
      sheetName,
      hasSheet: Boolean(sheet),
    });

    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null,
    });

    console.log("🟢 [XLS] rows parsed:", rows.length);
    console.log("🟢 [XLS] sample row:", rows[0] ?? null);

    /* -------------------------
       CREATE IMPORT BATCH
    ------------------------- */
    console.log("🟡 [DB] inserting supplier_import_batches");

    const { data: batch, error: batchError } = await supabase
      .from("supplier_import_batches")
      .insert({
        supplier: "gardners",
        filename: file.name,
        file_hash: fileHash,
        uploaded_by: auth.user.id,
        rows_total: rows.length,
        status: "uploaded",
      })
      .select("id")
      .single();

    console.log("🟡 [DB] insert result:", {
      batch,
      error: batchError ?? null,
    });

    if (batchError) {
      console.error("❌ [DB] failed to create import batch", batchError);
      return NextResponse.json(
        { error: "Failed to create import batch" },
        { status: 500 }
      );
    }

    /* -------------------------
       RESPONSE
    ------------------------- */
    console.log("✅ [GARDNERS UPLOAD] success", {
      batchId: batch.id,
      rows: rows.length,
    });

    return NextResponse.json({
      batch_id: batch.id,
      rows_count: rows.length,
      sample: rows.slice(0, 5),
    });
  } catch (err) {
    console.error("❌ [GARDNERS UPLOAD] uncaught failure:", err);
    return NextResponse.json(
      { error: "Failed to parse Gardners file" },
      { status: 500 }
    );
  }
}