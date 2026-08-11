import "server-only";

import type { ApiErrorResponse } from "@/contracts/api-error.contracts";
import { ApplicationError } from "@/server/core/errors/application-error";
import { privateJson } from "@/server/core/http/no-store-response";

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApplicationError) {
    return privateJson<ApiErrorResponse>(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { headers: error.headers, status: error.status },
    );
  }

  console.error("Unhandled route error", error);

  return privateJson<ApiErrorResponse>(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Внутрішня помилка сервера.",
      },
    },
    { status: 500 },
  );
}
