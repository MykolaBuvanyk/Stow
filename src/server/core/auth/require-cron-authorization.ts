import "server-only";

import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/config/server-env";
import { ApplicationError } from "@/server/core/errors/application-error";

export function requireCronAuthorization(request: Request): void {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${serverEnv.CRON_SECRET}`);

  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    throw new ApplicationError(
      "MAINTENANCE_UNAUTHORIZED",
      "Немає доступу до службового завдання.",
      401,
    );
  }
}
