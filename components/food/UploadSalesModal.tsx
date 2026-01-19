"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

export default function UploadSalesModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return alert("Select a file first");

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaded_by", "admin"); // or user.id

    const res = await fetch(
      "/api/admin/food/sales/sumup/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Upload failed");
      return;
    }

    onClose();
  }

  return (
    <Modal title="Upload Sales" onClose={onClose}>
      <input
        type="file"
        accept=".csv"
        onChange={(e) =>
          setFile(e.target.files?.[0] ?? null)
        }
      />

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </Modal>
  );
}
