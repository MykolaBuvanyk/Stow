import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import {
  API_RATE_LIMITS,
  type RateLimitAction,
} from "@/config/abuse-policy";
import { serverEnv } from "@/config/server-env";
import { consumeRateLimit } from "@/server/core/abuse/rate-limit.repository";
import { ApplicationError } from "@/server/core/errors/application-error";

function subjectHash(kind: "ip" | "user", value: string): string {
  return createHmac("sha256", serverEnv.CRON_SECRET)
    .update(`stow-rate-limit:${kind}:${value}`)
    .digest("hex");
}

function requestIp(request: Request): string | null {
  const candidates = [
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  return candidates.find((candidate) => candidate && isIP(candidate)) ?? null;
}

export async function enforceApiRateLimit(
  request: Request,
  userId: string,
  action: RateLimitAction,
): Promise<void> {
  const policy = API_RATE_LIMITS[action];
  const ip = requestIp(request);
  const checks = [
    consumeRateLimit(
      subjectHash("user", userId),
      action,
      policy.user,
      policy.windowSeconds,
    ),
  ];

  if (ip) {
    checks.push(
      consumeRateLimit(
        subjectHash("ip", ip),
        action,
        policy.ip,
        policy.windowSeconds,
      ),
    );
  }

  const results = await Promise.all(checks);
  const denied = results.find((result) => !result.allowed);

  if (denied) {
    throw new ApplicationError(
      "RATE_LIMIT_EXCEEDED",
      "Забагато запитів. Спробуйте трохи пізніше.",
      429,
      { headers: { "Retry-After": String(denied.retryAfterSeconds) } },
    );
  }
}

