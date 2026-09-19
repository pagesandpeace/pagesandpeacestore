import "server-only";
import { supabaseService } from "@/lib/supabase/service";

export async function consumeCommunityRateLimit(bucket: string, maxRequests: number, windowSeconds = 3600) {
  const { data, error } = await supabaseService()
    .schema("app_core")
    .rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

  if (error) {
    const isPreview = process.env.VERCEL_ENV === "preview";
    console.error("[community] rate-limit check failed", {
      code: error.code,
      message: error.message,
      environment: process.env.VERCEL_ENV ?? "unknown",
    });

    // Preview deployments may run before an additive migration has been
    // applied to the database they point at. Allow preview testing only.
    // Production remains fail-closed if the limiter is unavailable.
    if (isPreview) return true;
    return false;
  }

  return data === true;
}
