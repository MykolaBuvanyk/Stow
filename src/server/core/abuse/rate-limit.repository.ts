import "server-only";

import { ApplicationError } from "@/server/core/errors/application-error";
import { createSupabaseAdminClient } from "@/server/infrastructure/supabase/admin-client";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function consumeRateLimit(
  subjectHash: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_action: action,
    p_limit: limit,
    p_subject_hash: subjectHash,
    p_window_seconds: windowSeconds,
  });
  const result = data?.[0];

  if (error || !result) {
    throw new ApplicationError(
      "RATE_LIMIT_CHECK_FAILED",
      "Не вдалося перевірити ліміт запитів.",
      500,
      { cause: error ?? undefined },
    );
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retry_after_seconds,
  };
}

