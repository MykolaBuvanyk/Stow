import type { NextRequest } from "next/server";

import { requireCronAuthorization } from "@/server/core/auth/require-cron-authorization";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { runMaintenanceSweep } from "@/server/modules/maintenance/run-maintenance-sweep.service";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    requireCronAuthorization(request);
    const result = await runMaintenanceSweep();

    return privateJson(result, { status: result.failed > 0 ? 500 : 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
