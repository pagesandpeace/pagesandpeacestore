"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import Image from "next/image";

export default function AdminCreateBookPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState(""); // string e.g. "12.99"
  const [description, setDescription] = useState("");

  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("English");
  const [format, setFormat] = useState("Paperback");
  const [vibe, setVibe] = useState("");
  const [theme, setTheme] = useState("");

  const [inventory, setInventory] = useState(10);

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch("/api/admin/products/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg(null);

    if (!name || !price) {
      setSubmitting(false);
      setErrorMsg("Name and price are required.");
      return;
    }

    const payload = {
      name,
      price,
      description,
      author,
      genre,
      language,
      format,
      vibe,
      theme,
      image_url: imageUrl,
      inventory_count: inventory,
      product_type: "book",
    };

    const res = await fetch("/api/admin/products/create/book", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("CREATE BOOK ERROR:", errText);
      setSubmitting(false);
      setErrorMsg("Failed to create book.");
      return;
    }

    router.push("/admin/products");
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Create New Book</h1>

      {errorMsg && <Alert message={errorMsg} type="error" />}

      {/* BOOK NAME */}
      <div>
        <label className="block mb-1 font-medium">Book Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* PRICE */}
      <div>
        <label className="block mb-1 font-medium">Price (£) *</label>
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      {/* DESCRIPTION */}
      <div>
        <label className="block mb-1 font-medium">Description</label>
        <TextArea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* IMAGE UPLOADER */}
      <div>
        <label className="block mb-1 font-medium">Cover Image</label>

        <label className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center cursor-pointer">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          <span>Select image...</span>
        </label>

        {uploading && <p className="text-sm mt-1">Uploading...</p>}

        {imageUrl && (
          <div className="mt-3">
            <Image
              src={imageUrl}
              alt="Preview"
              width={200}
              height={300}
              className="object-cover rounded-lg shadow"
            />
          </div>
        )}
      </div>

      {/* BOOK METADATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

        <div>
          <label className="block mb-1 font-medium">Author</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Genre</label>
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Language</label>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Format</label>
          <Input value={format} onChange={(e) => setFormat(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Vibe</label>
          <Input value={vibe} onChange={(e) => setVibe(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Theme</label>
          <Input value={theme} onChange={(e) => setTheme(e.target.value)} />
        </div>

      </div>

      {/* INVENTORY */}
      <div className="mt-6">
        <label className="block mb-1 font-medium">Inventory Count</label>
        <Input
          type="number"
          min={0}
          value={inventory}
          onChange={(e) => setInventory(Number(e.target.value))}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-4 pt-6">
        <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Creating…" : "Create Book"}
        </Button>

        <Button variant="neutral" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
