"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleToggleNotifications = () => setNotifications((prev) => !prev);
  const handleToggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">Settings ⚙️</h1>
          <p className="text-[#111]/70 mt-2">
            Manage your preferences and account experience.
          </p>
        </header>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e0dcd6] p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b border-[#e0dcd6] pb-3">
            General Preferences
          </h2>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#111]/80 font-medium">Email Notifications</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={handleToggleNotifications}
                className="sr-only"
              />
              <span
                className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                  notifications ? "bg-[#5DA865]" : "bg-[#ccc]"
                }`}
              >
                <span
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    notifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#111]/80 font-medium">Dark Mode (coming soon)</span>
            <label className="inline-flex items-center cursor-pointer opacity-70">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={handleToggleDarkMode}
                disabled
                className="sr-only"
              />
              <span
                className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                  darkMode ? "bg-[#5DA865]" : "bg-[#ccc]"
                }`}
              >
                <span
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    darkMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </label>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e0dcd6] p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b border-[#e0dcd6] pb-3">
            Account
          </h2>

          <div className="space-y-3 text-sm">
            <p className="text-[#111]/80">
              Update your personal details and account preferences from your profile page.
            </p>
            <a
              href="/dashboard/account"
              className="text-[#5DA865] font-medium hover:underline"
            >
              Go to My Account →
            </a>
          </div>
        </div>

        {/* Save Changes Button (placeholder) */}
        <div className="text-center">
          <button
            disabled
            className="px-8 py-3 rounded-full bg-[#5DA865]/70 text-[#FAF6F1] font-semibold text-sm opacity-80 cursor-not-allowed"
          >
            Save Changes (Coming Soon)
          </button>
        </div>
      </section>
    </main>
  );
}
