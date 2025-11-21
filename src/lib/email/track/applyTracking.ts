// src/lib/newsletter/track/applyTracking.ts

import { BASE_URL } from "@/lib/email/client";

/**
 * Rewrites all <a href="..."> links so clicks route through our tracking URL.
 */
export function applyTracking(
  html: string,
  blastId: string,
  recipient: string
): string {
  if (!html) return html;

  // Regex for ALL <a href=""> links
  const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>/gi;

  return html.replace(linkRegex, (match, url) => {
    // Skip unsubscribe links
    if (url.includes("unsubscribe")) return match;

    const encodedUrl = encodeURIComponent(url);
    const encodedRecipient = encodeURIComponent(recipient);
    const encodedBlast = encodeURIComponent(blastId);

    const trackingUrl = `${BASE_URL}/api/newsletter/track/click?blastId=${encodedBlast}&recipient=${encodedRecipient}&url=${encodedUrl}`;

    return match.replace(url, trackingUrl);
  });
}
