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
    console.error("[community] rate-limit check failed");
    return false;
  }
  return data === true;
}
