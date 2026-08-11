import { apiErrorResponseSchema } from "@/contracts/api-error.contracts";
import {
  STOW_REQUEST_HEADER,
  STOW_REQUEST_HEADER_VALUE,
} from "@/config/http-policy";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init?.headers);

  headers.set("Accept", "application/json");

  if (!SAFE_METHODS.has(method)) {
    headers.set(STOW_REQUEST_HEADER, STOW_REQUEST_HEADER_VALUE);
  }

  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);

    if (parsedError.success) {
      throw new ApiClientError(
        parsedError.data.error.code,
        response.status,
        parsedError.data.error.message,
      );
    }

    throw new ApiClientError(
      "INVALID_API_RESPONSE",
      response.status,
      "Сервер повернув некоректну відповідь.",
    );
  }

  return payload as T;
}
