export const runtime = "nodejs";

import * as XLSX from "xlsx";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    console.log("🟡 [UPLOAD] route hit");

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth, error: authError } = await supabase.auth.getUser();
    console.log("🟡 [UPLOAD] auth", auth, authError);

    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    console.log("🟡 [UPLOAD] profile", profile, profileError);

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       FILE
    ------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const fileHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    console.log("🟡 [UPLOAD] file hash", fileHash);

    /* -------------------------
       PARSE XLS
    ------------------------- */
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null,
    });

    console.log("🟡 [UPLOAD] rows parsed", rows.length);

    /* -------------------------
       CREATE IMPORT BATCH
    ------------------------- */
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

    if (batchError) {
      console.error("❌ [UPLOAD] batch insert failed", batchError);
      return NextResponse.json(
        { error: batchError.message },
        { status: 500 }
      );
    }

    console.log("🟢 [UPLOAD] batch created", batch.id);

    return NextResponse.json({
      batch_id: batch.id,
      rows_count: rows.length,
    });
  } catch (err) {
    console.error("❌ [UPLOAD] fatal error", err);
    return NextResponse.json(
      { error: "Failed to parse Gardners file" },
      { status: 500 }
    );
  }
}
