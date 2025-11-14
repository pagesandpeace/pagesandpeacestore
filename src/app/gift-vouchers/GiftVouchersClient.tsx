"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/input";

// 🔥 Correct client-side auth function
import { getCurrentUserClient } from "@/lib/auth/client";

type Delivery = "email_now" | "schedule" | "print";
const PRESETS = [1000, 2000, 3000, 5000] as const;

const DELIVERY_OPTIONS: { key: Delivery; label: string }[] = [
  { key: "email_now", label: "Email now" },
  { key: "schedule", label: "Schedule" },
  { key: "print", label: "Print at home" },
];

export default function GiftVouchersClient() {
  const router = useRouter();

  // User auth
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);

  // Form state
  const [amount, setAmount] = useState<number>(2000);
  const [customAmount, setCustomAmount] = useState("20");
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("email_now");
  const [sendDate, setSendDate] = useState("");
  const [sendToMe, setSendToMe] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState("");

  // Validation
  const [invalidRecipient, setInvalidRecipient] = useState(false);
  const [invalidDate, setInvalidDate] = useState(false);

  /* -------------------------------------------------------------------------- */
  /*                                LOAD USER                                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const u = await getCurrentUserClient();
      if (u) {
        setUserEmail(u.email);
        setUserName(u.name ?? "");
        setFromName((prev) => (prev ? prev : u.name ?? ""));
      } else {
        setUserEmail(null);
        setUserName("");
      }
      setUserLoaded(true);
    })();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                         SYNC CUSTOM AMOUNT INPUT                           */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const pounds = parseInt(customAmount || "0", 10);
    const safe = isNaN(pounds) ? 0 : pounds;
    setAmount(Math.max(500, safe * 100));
  }, [customAmount]);

  const selectPreset = (v: number) => {
    setAmount(v);
    setCustomAmount(String(v / 100));
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
  };

  /* -------------------------------------------------------------------------- */
  /*                               CHECKOUT                                     */
  /* -------------------------------------------------------------------------- */
  const handleCheckout = async () => {
    if (!userEmail) {
      router.push(`/sign-in?callbackURL=${encodeURIComponent("/gift-vouchers")}`);
      return;
    }

    const wantsEmail = delivery !== "print";
    const effectiveRecipient = sendToMe ? userEmail : recipientEmail;

    setInvalidRecipient(false);
    setInvalidDate(false);

    if (wantsEmail) {
      if (!effectiveRecipient) {
        setInvalidRecipient(true);
        return;
      }
      const looksEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveRecipient);
      if (!looksEmail) {
        setInvalidRecipient(true);
        return;
      }
    }

    if (delivery === "schedule" && !sendDate) {
      setInvalidDate(true);
      return;
    }

    try {
      const res = await fetch("/api/vouchers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          toName,
          fromName,
          message,
          delivery,
          sendDate: delivery === "schedule" ? sendDate : "",
          sendToMe,
          recipientEmail: sendToMe ? "" : recipientEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Sorry, something went wrong. Please try again.");
      }
    } catch {
      alert("Sorry, something went wrong. Please try again.");
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER                                    */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-[calc(100dvh-120px)] grid md:grid-cols-2">
      {/* Left side: Preview */}
      <div
        className="flex items-center justify-center p-6 md:p-10 lg:p-12"
        style={{
          backgroundImage: "url(/frames/voucher-frame.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full" style={{ maxWidth: 440 }}>
          <div
            className="w-full rounded-2xl border p-6 shadow-sm bg-white"
            style={{ aspectRatio: "2 / 3" }}
          >
            <div className="text-sm uppercase tracking-wide opacity-60">
              Pages & Peace
            </div>
            <h1 className="mt-2 text-3xl font-semibold">Gift Voucher</h1>
            <p className="mt-3 text-sm opacity-80">
              A treat for books, coffee, and calm. Use in store. Show your QR at the counter.
            </p>

            <div className="mt-6 rounded-xl border p-4">
              <div className="text-sm opacity-60">Voucher preview</div>
              <div className="mt-2 text-2xl font-semibold">
                <span key={amount} className="pulse-in">
                  £{(amount / 100).toFixed(2)}
                </span>
              </div>

              <div className="mt-1 text-sm">
                To:
                <strong>
                  <span key={`to-${toName}`} className="pulse-in">
                    {toName || "Recipient"}
                  </span>
                </strong>
                {" • "}
                From:
                <strong>
                  <span key={`from-${fromName}`} className="pulse-in">
                    {fromName || userName || "You"}
                  </span>
                </strong>
              </div>

              <div className="mt-2 text-xs italic opacity-70 line-clamp-3">
                <span key={`msg-${message}`} className="pulse-in">
                  {message || "Your message will appear here."}
                </span>
              </div>
            </div>

            <div className="mt-6 text-xs opacity-70">
              Valid for 24 months. Can be used across multiple visits until the balance is used.
            </div>

            <div className="mt-4 ml-auto relative" style={{ width: "22%", aspectRatio: "1 / 1" }}>
              <Image
                src="/dummy-qr.svg"
                alt="Voucher QR preview"
                fill
                className="rounded-lg"
                sizes="120px"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="p-6 md:p-10 flex items-start">
        <div className="w-full max-w-lg">

          {/* Cancel button */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              ← Cancel and return to Dashboard
            </button>
          </div>

          {/* Login notice */}
          {userLoaded && !userEmail && (
            <div className="rounded-xl border bg-white p-4 text-sm mb-6">
              <div className="text-[var(--foreground)]/85">
                🎁 Gift vouchers require an account so we can send receipts and help you manage them.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => router.push(`/sign-up?callbackURL=${encodeURIComponent("/gift-vouchers")}`)}
                  className="rounded-full px-4 py-2 bg-[var(--accent)] text-[var(--background)] font-semibold text-sm"
                >
                  Create account
                </button>
                <button
                  onClick={() => router.push(`/sign-in?callbackURL=${encodeURIComponent("/gift-vouchers")}`)}
                  className="rounded-full px-4 py-2 border border-[var(--accent)] text-[var(--accent)] font-semibold text-sm"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-semibold">Buy a voucher</h2>
          <p className="mt-1 text-sm opacity-80">Instant email delivery or print at home.</p>

          {/* ---------------------------- Amount ---------------------------- */}
          <div className="mt-6">
            <label className="text-sm font-medium">Amount</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => selectPreset(v)}
                  className={`px-4 py-2 rounded-full border ${
                    amount === v ? "border-black" : "border-gray-300"
                  }`}
                >
                  £{(v / 100).toFixed(0)}
                </button>
              ))}

              <div className="flex items-center gap-2">
                <span className="text-sm">Custom</span>
                <Input
                  type="number"
                  min={5}
                  step={1}
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------- Names ---------------------------- */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                className="mt-2"
                placeholder="Recipient’s name"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">From</label>
              <Input
                className="mt-2"
                placeholder={userName ? `From ${userName}` : "Your name"}
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
          </div>

          {/* ---------------------------- Message ---------------------------- */}
          <div className="mt-4">
            <label className="text-sm font-medium">Message (optional)</label>
            <textarea
              className="mt-2 w-full rounded-md bg-white px-4 py-3 text-[#111] placeholder:text-[#777] outline-none border border-[#ccc] focus:ring-2 focus:ring-[var(--accent)]/30"
              rows={3}
              placeholder="Add a short note…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* ---------------------------- Delivery ---------------------------- */}
          <div className="mt-4">
            <label className="text-sm font-medium">Delivery</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DELIVERY_OPTIONS.map((d) => (
                <button
                  type="button"
                  key={d.key}
                  onClick={() => setDelivery(d.key)}
                  className={`px-3 py-2 rounded border text-sm ${
                    delivery === d.key ? "border-black" : "border-gray-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* ---------------------------- Recipient Email ---------------------------- */}
          {delivery !== "print" && (
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendToMe}
                  onChange={(e) => setSendToMe(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span>Send to me {userEmail ? `(${userEmail})` : ""}</span>
              </label>

              {!sendToMe && (
                <>
                  <label className="text-sm font-medium">Recipient email</label>
                  <Input
                    className="mt-1"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    invalid={invalidRecipient}
                  />
                  {invalidRecipient && (
                    <p className="text-xs text-red-600 mt-1">
                      Please enter a valid email.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---------------------------- Scheduled Date ---------------------------- */}
          {delivery === "schedule" && (
            <div className="mt-4">
              <label className="text-sm font-medium">Send date</label>
              <Input
                type="date"
                className="mt-2"
                value={sendDate}
                onChange={(e) => setSendDate(e.target.value)}
                invalid={invalidDate}
              />
              {invalidDate && (
                <p className="text-xs text-red-600 mt-1">
                  Please choose a date.
                </p>
              )}
            </div>
          )}

          {/* ---------------------------- Checkout Button ---------------------------- */}
          <button
            onClick={handleCheckout}
            className="mt-6 w-full rounded-xl bg-black text-white py-3 text-center text-sm font-medium"
          >
            {userEmail
              ? `Pay £${(amount / 100).toFixed(2)} securely`
              : "Sign in to buy"}
          </button>

          <p className="mt-3 text-xs opacity-70">Powered by Stripe.</p>
        </div>
      </div>
    </div>
  );
}
