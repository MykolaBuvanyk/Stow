import "server-only";

import type { NextRequest } from "next/server";

import {
  STOW_REQUEST_HEADER,
  STOW_REQUEST_HEADER_VALUE,
} from "@/config/http-policy";
import { ApplicationError } from "@/server/core/errors/application-error";

export function requireSameOrigin(request: NextRequest): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestMarker = request.headers.get(STOW_REQUEST_HEADER);

  let sourceOrigin: string | null = null;

  try {
    sourceOrigin = origin ?? (referer ? new URL(referer).origin : null);
  } catch {
    sourceOrigin = null;
  }

  if (
    fetchSite === "cross-site" ||
    sourceOrigin !== request.nextUrl.origin ||
    requestMarker !== STOW_REQUEST_HEADER_VALUE
  ) {
    throw new ApplicationError(
      "CROSS_ORIGIN_REQUEST",
      "Запит з іншого джерела заборонено.",
      403,
    );
  }
}
