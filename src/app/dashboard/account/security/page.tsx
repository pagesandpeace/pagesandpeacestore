"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/lib/auth/actions";

export default function SecurityPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage("⚠️ New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);

      if (res.ok) {
        setMessage("✅ Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // redirect after short delay
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setMessage(`❌ ${res.message || "Incorrect current password or invalid request."}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] flex flex-col items-center py-16 px-6 font-[Montserrat]">
      <section className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-wide text-[#111]">
            Change Password 🔐
          </h1>
          <p className="text-[#111]/70 mt-2 text-sm">
            Update your password securely below.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Current password */}
          <div className="pb-6 border-b border-[#dcd6cf]">
            <label
              htmlFor="currentPassword"
              className="block text-xs uppercase tracking-wide text-[#777] font-medium mb-2"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              className="w-full border-b border-[#ccc] bg-transparent py-2 text-[#111] placeholder:text-[#777] focus:outline-none focus:border-[#5DA865]"
            />
          </div>

          {/* New password */}
          <div className="pb-6 border-b border-[#dcd6cf]">
            <label
              htmlFor="newPassword"
              className="block text-xs uppercase tracking-wide text-[#777] font-medium mb-2"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="w-full border-b border-[#ccc] bg-transparent py-2 text-[#111] placeholder:text-[#777] focus:outline-none focus:border-[#5DA865]"
            />
          </div>

          {/* Confirm new password */}
          <div className="pb-6 border-b border-[#dcd6cf]">
            <label
              htmlFor="confirmPassword"
              className="block text-xs uppercase tracking-wide text-[#777] font-medium mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full border-b border-[#ccc] bg-transparent py-2 text-[#111] placeholder:text-[#777] focus:outline-none focus:border-[#5DA865]"
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mt-6 text-center text-sm font-medium px-4 py-2 rounded-full border transition-all duration-300 ${
                message.startsWith("✅")
                  ? "bg-green-50 border-green-300 text-green-700"
                  : message.startsWith("⚠️")
                  ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                  : "bg-red-50 border-red-300 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-block px-8 py-3 rounded-full bg-[#5DA865] text-[#FAF6F1] font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
