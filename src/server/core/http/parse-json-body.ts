import "server-only";

import { ApplicationError } from "@/server/core/errors/application-error";

const MAX_JSON_BODY_BYTES = 16 * 1024;

export async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApplicationError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Очікується JSON-запит.",
      415,
    );
  }

  const body = await request.text();

  if (new TextEncoder().encode(body).byteLength > MAX_JSON_BODY_BYTES) {
    throw new ApplicationError(
      "REQUEST_TOO_LARGE",
      "Тіло запиту занадто велике.",
      413,
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApplicationError("INVALID_JSON", "Некоректний JSON.", 400);
  }
}
