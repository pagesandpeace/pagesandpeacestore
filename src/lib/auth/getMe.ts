// src/lib/auth/getMe.ts
export async function getMeClient() {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.id ? data : null;
  } catch {
    return null;
  }
}
