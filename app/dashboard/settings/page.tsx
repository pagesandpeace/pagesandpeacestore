"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const { user } = useUser();

  // Initialize from localStorage (client-safe)
  const [notifications, setNotifications] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("pp:notifications");
    return stored !== null ? stored === "true" : true;
  });

  const toggleNotifications = () => {
    const next = !notifications;
    setNotifications(next);
    localStorage.setItem("pp:notifications", String(next));
  };

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    window.location.href = "/sign-in";
  };

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-3xl mx-auto space-y-10">

        {/* HEADER */}
        <header className="border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">
            Settings ⚙️
          </h1>
          <p className="text-[#111]/70 mt-1">
            Manage your basic account preferences.
          </p>
        </header>

        {/* USER INFO */}
        <div className="bg-white rounded-xl border border-[#e0dcd6] shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Your Account</h2>

          {user ? (
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>

              <Link
                href="/dashboard/account"
                className="text-[#5DA865] font-medium hover:underline text-sm"
              >
                Edit Account →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              You are not signed in.
            </p>
          )}
        </div>

        {/* NOTIFICATION SETTINGS */}
        <div className="bg-white rounded-xl border border-[#e0dcd6] shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Preferences</h2>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#111]/80 font-medium">
              Email Notifications
            </span>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={toggleNotifications}
                className="sr-only"
              />
              <span
                className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ${
                  notifications ? "bg-[#5DA865]" : "bg-[#ccc]"
                }`}
              >
                <span
                  className={`bg-white w-4 h-4 rounded-full shadow transform duration-300 ${
                    notifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </label>
          </div>
        </div>

        {/* SIGN OUT */}
        <div className="text-center">
          <button
            onClick={handleSignOut}
            className="px-8 py-3 rounded-full bg-[#d9534f] text-white font-semibold text-sm hover:bg-[#c64540] transition"
          >
            Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}
