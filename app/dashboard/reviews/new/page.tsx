"use client";

import { ImagePlus, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BookSearchPicker, { type SelectedBook } from "@/components/community/BookSearchPicker";

export default function NewReviewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [book, setBook] = useState<SelectedBook | null>(null);
  const [rating, setRating] = useState(0);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    form.set("containsSpoilers", form.get("containsSpoilers") === "on" ? "true" : "false");
    if (book) form.set("selectedBook", JSON.stringify(book));

    const file = fileInputRef.current?.files?.[0] ?? null;
    form.delete("file");
    if (file) {
      const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
      if (!allowed.has(file.type)) {
        setBusy(false);
        setError("Use a JPG, PNG, WebP or AVIF image.");
        return;
      }
      if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
        setBusy(false);
        setError("Images must be smaller than 8 MB.");
        return;
      }

      setUploading(true);
      try {
        const signatureResponse = await fetch("/api/app-core/book-reviews/image-signature", { method: "POST" });
        const signature = await signatureResponse.json().catch(() => null);
        if (!signatureResponse.ok || !signature?.cloudName || !signature?.apiKey || !signature?.signature || !signature?.publicId || !signature?.timestamp) {
          throw new Error(signature?.error || "Could not prepare image upload.");
        }

        const uploadForm = new FormData();
        uploadForm.set("file", file);
        uploadForm.set("api_key", signature.apiKey);
        uploadForm.set("timestamp", String(signature.timestamp));
        uploadForm.set("signature", signature.signature);
        uploadForm.set("public_id", signature.publicId);

        const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, {
          method: "POST",
          body: uploadForm,
        });
        const cloud = await cloudResponse.json().catch(() => null);
        if (!cloudResponse.ok || !cloud?.public_id) throw new Error(cloud?.error?.message || "Image upload failed.");
        form.set("imagePublicId", cloud.public_id);
      } catch (uploadError) {
        setUploading(false);
        setBusy(false);
        setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded. Please try again.");
        return;
      }
      setUploading(false);
    }

    const response = await fetch("/api/app-core/book-reviews", { method: "POST", body: form });
    const data = await response.json().catch(() => null);

    setBusy(false);
    if (!response.ok) {
      setError(data?.error || "We could not publish your review.");
      return;
    }

    router.push(`/books/${data.bookSlug}/reviews/${data.reviewSlug ?? data.reviewId}`);
    router.refresh();
  }

  return (
    <main className="w-full bg-[#fbf8f3] px-4 py-8 text-[#24342c] md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-medium text-neutral-700 hover:text-[#486553]">
          ← Back to my account
        </Link>

        <div className="mt-7">
          <h1 className="font-serif text-4xl leading-tight text-[#2d261f] md:text-5xl">Write a book review</h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-500 md:text-lg">
            Share your thoughts and help fellow readers discover their next great read.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,.9fr)]">
          <section className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm md:p-7">
            <div>
              <h2 className="text-lg font-semibold text-[#24221e]">1. Find or add your book</h2>
              <div className="mt-5">
                <BookSearchPicker onSelect={setBook} />
              </div>
            </div>

            <div className="mt-9 border-t border-black/6 pt-8">
              <h2 className="text-lg font-semibold text-[#24221e]">2. Your review</h2>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-[#2d2a26]">Rating</legend>
                <div className="mt-3 flex items-center gap-2" aria-label="Book rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        value={value}
                        required
                        className="sr-only"
                        onChange={() => setRating(value)}
                      />
                      <span
                        aria-hidden="true"
                        className={`text-4xl leading-none transition-colors ${value <= rating ? "text-[#6c806f]" : "text-neutral-300"}`}
                      >
                        ★
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-500">{rating ? `${rating} out of 5` : "Tap to rate"}</p>
              </fieldset>

              <label className="mt-7 block text-sm font-semibold text-[#2d2a26]">
                Your review
                <textarea
                  name="body"
                  required
                  minLength={40}
                  maxLength={5000}
                  rows={9}
                  className="mt-2 w-full resize-y rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal leading-7 outline-none transition focus:border-[#6c806f] focus:ring-2 focus:ring-[#6c806f]/15"
                  placeholder="Write your thoughts about this book..."
                />
              </label>

              <label className="mt-5 flex items-start gap-3 rounded-xl border border-black/6 bg-[#fcfaf7] p-4 text-sm">
                <input type="checkbox" name="containsSpoilers" className="mt-1 h-4 w-4 rounded border-neutral-300" />
                <span>
                  <strong className="font-semibold text-[#2d2a26]">This review contains spoilers</strong>
                  <span className="mt-1 block text-neutral-500">Readers will see a spoiler warning before the main text.</span>
                </span>
              </label>

              {error ? (
                <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-[#24221e]">Add a photo <span className="font-normal">(optional)</span></h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Share a photo of the book, your copy or a cosy reading moment.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-[#fcfaf7] px-5 py-8 text-center transition hover:border-[#6c806f] hover:bg-[#f7f3ec] focus:outline-none focus:ring-2 focus:ring-[#6c806f]/20"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef1ec] text-[#486553]">
                  <ImagePlus className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="mt-4 text-sm font-semibold text-[#2d2a26]">Upload a photo</span>
                <span className="mt-1 text-xs text-neutral-500">Click to browse · JPG, PNG, WebP or AVIF · max 8 MB</span>
                {fileName ? <span className="mt-3 max-w-full truncate text-xs font-medium text-[#486553]">{fileName}</span> : null}
              </button>
            </section>

            <section className="rounded-2xl border border-black/8 bg-[#f3f2eb] p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe7dc] text-[#486553]">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-serif text-xl leading-tight text-[#2d261f]">Be part of a kinder, quieter reading community</h2>
                  <ul className="mt-4 space-y-3 text-sm text-neutral-600">
                    <li>Share what you loved — or didn’t.</li>
                    <li>Help other readers discover new books.</li>
                    <li>Keep it kind and respectful.</li>
                    <li>Your review will be visible to all visitors.</li>
                  </ul>
                </div>
              </div>
            </section>

            <button
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#354a3d] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2c3f34] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {uploading ? "Uploading photo…" : busy ? "Publishing…" : "Publish review"}
            </button>

            <p className="text-center text-xs text-neutral-500">You can edit or remove your review at any time.</p>
          </aside>
        </form>
      </div>
    </main>
  );
}
