"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NewsletterAIAssistant from "@/components/admin/newsletter/NewsletterAIAssistant";

// ❌ REMOVE THIS — it caused the Resend API key error
// import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";

// ✅ SAFE PREVIEW-ONLY WRAPPER
import newsletterPreview from "@/lib/email/templates/newsletterPreview";

/* ------------------------------------------
   TYPES
------------------------------------------- */
type EmailBlast = {
  id: string;
  subject: string;
  body: string;
  recipientCount: number;
  category: string;
  createdAt: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
};

export default function NewsletterAdminPage() {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [previewMode, setPreviewMode] = useState<"raw" | "template">("raw");
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState("");

  const [history, setHistory] = useState<EmailBlast[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  /* ------------------------------------------
     LOAD BLAST HISTORY
  ------------------------------------------- */
  useEffect(() => {
    async function loadHistory() {
      const res = await fetch("/api/newsletter/history");
      const data = await res.json();
      if (data.ok) setHistory(data.blasts);
    }
    loadHistory();
  }, []);

  /* ------------------------------------------
     SAVE TEMPLATE
  ------------------------------------------- */
  async function saveTemplate() {
    const name = prompt("Template name?");
    if (!name) return;

    await fetch("/api/newsletter/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body, category }),
    });

    alert("Template saved!");
  }

  /* ------------------------------------------
     LOAD TEMPLATES
  ------------------------------------------- */
  async function loadTemplates() {
    const res = await fetch("/api/newsletter/templates");
    const data = await res.json();
    if (data.ok) {
      setTemplates(data.templates);
      setShowTemplatesModal(true);
    }
  }

  /* ------------------------------------------
     SEND BLAST
  ------------------------------------------- */
  async function sendBlast() {
    setSending(true);
    setMessage("");

    const res = await fetch("/api/newsletter/blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, category }),
    });

    const data = await res.json();
    setSending(false);

    if (!data.ok) {
      setMessage("❌ " + data.error);
      return;
    }

    setMessage(`✅ Email sent to ${data.sentTo} subscribers.`);
    setSubject("");
    setBody("");
    router.refresh();
  }

  /* ------------------------------------------
     SEND TEST EMAIL
  ------------------------------------------- */
  async function sendTest() {
    setSending(true);
    setMessage("");

    const res = await fetch("/api/newsletter/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, category, to: testEmail }),
    });

    const data = await res.json();
    setSending(false);

    if (!data.ok) {
      setMessage("❌ " + data.error);
      return;
    }

    setMessage("✅ Test email sent!");
  }

  /* ------------------------------------------
     CATEGORY BADGE COLORS
  ------------------------------------------- */
  const badgeColors: Record<string, string> = {
    event: "bg-blue-100 text-blue-700",
    community: "bg-green-100 text-green-700",
    books: "bg-purple-100 text-purple-700",
    product: "bg-amber-100 text-amber-700",
    cafe: "bg-rose-100 text-rose-700",
    news: "bg-indigo-100 text-indigo-700",
    follow_up: "bg-orange-100 text-orange-700",
    general: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-10">

      <h1 className="text-4xl font-semibold text-[#3c2f23]">
        Newsletter Manager
      </h1>

      {/* AI Assistant */}
      <NewsletterAIAssistant
        onInsert={(text: string) => setBody((prev) => prev + "\n\n" + text)}
      />

      {message && (
        <div className="p-3 rounded bg-green-100 text-green-900 text-sm">
          {message}
        </div>
      )}

      {/* BUTTONS */}
      <div className="flex gap-4">
        <button
          onClick={saveTemplate}
          className="px-4 py-2 bg-[#5da865] text-white rounded hover:bg-[#4c8d55]"
        >
          Save as Template
        </button>

        <button
          onClick={loadTemplates}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Load Template
        </button>
      </div>

      {/* SUBJECT */}
      <div className="space-y-2">
        <label className="font-semibold text-[#59472e]">Subject</label>
        <input
          className="w-full border p-2 rounded bg-white"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject…"
        />
      </div>

      {/* CATEGORY */}
      <div className="space-y-2">
        <label className="font-semibold">Category</label>

        <select
          className="w-full border p-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="general">General</option>
          <option value="event">Event</option>
          <option value="community">Community update</option>
          <option value="books">Book recommendations</option>
          <option value="product">Product launch (shop)</option>
          <option value="cafe">Café specials</option>
          <option value="news">News</option>
          <option value="follow_up">Follow-up</option>
        </select>
      </div>

      {/* PREVIEW MODE SWITCH */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setPreviewMode("raw")}
          className={`px-4 py-2 rounded ${
            previewMode === "raw"
              ? "bg-[#5da865] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Edit Raw HTML
        </button>

        <button
          onClick={() => setPreviewMode("template")}
          className={`px-4 py-2 rounded ${
            previewMode === "template"
              ? "bg-[#5da865] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Full Template Preview
        </button>
      </div>

      {/* BODY / PREVIEW */}
      {previewMode === "raw" ? (
        <textarea
          className="w-full border p-3 rounded h-96 bg-white"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email in raw HTML…"
        />
      ) : (
        <div
          className="w-full border p-4 rounded bg-white shadow-sm overflow-auto max-h-[700px]"
          dangerouslySetInnerHTML={{ __html: newsletterPreview(body) }}
        />
      )}

      {/* SEND TEST */}
      <div className="pt-6 border-t">
        <h2 className="font-semibold text-lg text-[#3c2f23]">
          Send Test Email
        </h2>
        <div className="flex gap-2 mt-2">
          <input
            className="border p-2 rounded flex-1 bg-white"
            placeholder="your.email@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <button
            onClick={sendTest}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send Test
          </button>
        </div>
      </div>

      {/* SEND BLAST */}
      <button
        onClick={sendBlast}
        disabled={sending}
        className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send to All Subscribers"}
      </button>

      {/* HISTORY */}
      <div className="pt-10 border-t">
        <h2 className="text-xl font-bold mb-4 text-[#3c2f23]">
          Previous Blasts
        </h2>

        <div className="space-y-4">
          {history.map((h) => {
            const badgeStyle = badgeColors[h.category] ?? badgeColors["general"];

            return (
              <div key={h.id} className="p-4 border rounded bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-lg">{h.subject}</p>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeStyle}`}>
                    {h.category}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-1">
                  Sent to {h.recipientCount} subscribers
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })}

          {history.length === 0 && (
            <p className="text-gray-500">No blasts sent yet.</p>
          )}
        </div>
      </div>

      {/* TEMPLATE MODAL */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Choose a Template</h2>

            {templates.map((t) => (
              <div
                key={t.id}
                className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSubject(t.subject);
                  setBody(t.body);
                  setCategory(t.category);
                  setShowTemplatesModal(false);
                }}
              >
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-gray-500">{t.category}</p>
              </div>
            ))}

            <button
              onClick={() => setShowTemplatesModal(false)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
