"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* -------------------------------------------
   TYPES
------------------------------------------- */

type UploadResult = {
  batch_id: string;
  rows_count: number;
};

type DiffResult = {
  valid_rows: number;
  new_records: number;
  unchanged: number;
  price_changes: number;
};

type ApplyResult = {
  batch_id: string;
  inserted_supplier_products: number;
  updated_supplier_prices: number;
  rankings_inserted?: number;
};

/* -------------------------------------------
   COMPONENT
------------------------------------------- */

export default function GardnersSyncClient() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [diffing, setDiffing] = useState(false);
  const [applying, setApplying] = useState(false);

  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------
     RESET WORKFLOW
  ------------------------------------------- */

  function resetWorkflow() {
    setFile(null);
    setBatchId(null);
    setUploadResult(null);
    setDiff(null);
    setApplyResult(null);
    setError(null);
  }

  /* -------------------------------------------
     STEP 1 — UPLOAD
  ------------------------------------------- */

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);
    setDiff(null);
    setApplyResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/suppliers/gardners/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      setUploadResult({
        batch_id: data.batch_id,
        rows_count: data.rows_count,
      });
      setBatchId(data.batch_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------------------
     STEP 2 — DIFF
  ------------------------------------------- */

  async function handlePreviewDiff() {
    if (!file || !batchId) return;

    setDiffing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("batch_id", batchId);

      const res = await fetch("/api/admin/suppliers/gardners/diff", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Diff failed");

      setDiff(data);
    } catch {
      setError("Failed to calculate supplier diff");
    } finally {
      setDiffing(false);
    }
  }

  /* -------------------------------------------
     STEP 3 — APPLY
  ------------------------------------------- */

  async function handleApply() {
    if (!file || !batchId) return;

    const confirmed = confirm(
      "This will record a supplier snapshot.\n\n" +
        "• Supplier catalogue data will be stored\n" +
        "• Rankings for this batch will be captured\n\n" +
        "No customer-facing products will be created or updated.\n\nProceed?"
    );
    if (!confirmed) return;

    setApplying(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("batch_id", batchId);

      const res = await fetch("/api/admin/suppliers/gardners/apply", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Apply failed");

      setApplyResult(data);
      router.refresh();
    } catch {
      setError("Failed to record Gardners snapshot");
    } finally {
      setApplying(false);
    }
  }

  /* -------------------------------------------
     RENDER
  ------------------------------------------- */

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <Alert type="error" message={error} />}

      {/* STEP 1 — UPLOAD */}
      {!batchId && (
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Gardners File</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload the latest Gardners spreadsheet. The file will be stored and
              fingerprinted before any data is written.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={uploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Uploading…" : "Upload File"}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* UPLOAD CONFIRMATION */}
      {uploadResult && !diff && (
        <Card>
          <CardHeader>
            <CardTitle>File Uploaded</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p><strong>Batch ID:</strong> {uploadResult.batch_id}</p>
            <p><strong>Rows detected:</strong> {uploadResult.rows_count}</p>

            <Button
              variant="neutral"
              onClick={handlePreviewDiff}
              disabled={diffing}
            >
              {diffing ? "Analysing…" : "Preview Supplier Diff"}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* DIFF SUMMARY */}
      {diff && (
        <Card>
          <CardHeader>
            <CardTitle>2. Supplier Diff Summary</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>Valid supplier rows:</strong> {diff.valid_rows}</p>
            <p><strong>New supplier SKUs:</strong> {diff.new_records}</p>
            <p><strong>Supplier price changes:</strong> {diff.price_changes}</p>
            <p><strong>Unchanged:</strong> {diff.unchanged}</p>
          </CardBody>
        </Card>
      )}

      {/* APPLY */}
      {diff && !applyResult && (
        <Card>
          <CardHeader>
            <CardTitle>3. Record Supplier Snapshot</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            {diff.new_records === 0 && diff.price_changes === 0 && (
              <Alert
                type="info"
                message="No supplier catalogue changes detected. A rankings snapshot will still be recorded."
              />
            )}

            <Button onClick={handleApply} disabled={applying}>
              {applying ? "Recording…" : "Record Snapshot"}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* RESULT */}
      {applyResult && (
        <Card>
          <CardHeader>
            <CardTitle>Snapshot Recorded</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p><strong>Batch ID:</strong> {applyResult.batch_id}</p>
            <p>
              <strong>Supplier records captured:</strong>{" "}
              {applyResult.inserted_supplier_products}
            </p>
            <p>
              <strong>Supplier price changes:</strong>{" "}
              {applyResult.updated_supplier_prices}
            </p>

            <p className="text-muted-foreground">
              No catalogue products were created or modified.
            </p>

            <Button variant="neutral" onClick={resetWorkflow}>
              Done
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
