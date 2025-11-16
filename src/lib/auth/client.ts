"use client";

export async function getCurrentUserClient() {
  try {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);

    return data?.id ? data : null;
  } catch (err) {
    console.error("getCurrentUserClient failed:", err);
    return null;
  }
}
