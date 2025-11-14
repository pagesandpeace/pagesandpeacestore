export async function getCurrentUserClient() {
  console.log("📡 [Client] getCurrentUserClient()");

  try {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    });

    console.log("📡 [Client] /api/me status:", res.status);

    const data = await res.json().catch(() => "JSON PARSE FAILED");
    console.log("📡 [Client] data:", data);

    if (!res.ok || !data?.id) return null;

    return data;
  } catch (err) {
    console.error("💥 [Client] getCurrentUserClient() failed:", err);
    return null;
  }
}
