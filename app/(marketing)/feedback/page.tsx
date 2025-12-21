"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState } from "react";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function FeedbackPage() {
  const [rating, setRating] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess(false);

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter feedback.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/feedback/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating,
        message,
        email: email || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
    setMessage("");
    setEmail("");
    setRating("");
  }

  return (
    <main className="min-h-screen bg-[#FAF6F1] pb-20 font-[Montserrat]">
      <div className="max-w-xl mx-auto px-6 pt-16 space-y-6">
        <h1 className="text-3xl font-bold text-[#111]">
          Leave Feedback
        </h1>

        <p className="text-neutral-700">
          Your feedback helps us improve. Everything is anonymous unless you choose to leave your email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block mb-1 font-medium">
              How was your experience?
            </label>

            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Choose…</option>
              <option value="5">⭐️⭐️⭐️⭐️⭐️ Excellent</option>
              <option value="4">⭐️⭐️⭐️⭐️ Good</option>
              <option value="3">⭐️⭐️⭐️ Okay</option>
              <option value="2">⭐️⭐️ Poor</option>
              <option value="1">⭐️ Very Poor</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block mb-1 font-medium">
              Tell us more
            </label>
            <TextArea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1 font-medium">
              Email (optional)
            </label>
            <Input
              type="email"
              value={email}
              placeholder="If you'd like a reply…"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <Alert type="error" message={error} />}
          {success && (
            <Alert
              type="success"
              message="Thank you! Your feedback has been submitted."
            />
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Feedback"}
          </Button>
        </form>
      </div>
    </main>
  );
}
