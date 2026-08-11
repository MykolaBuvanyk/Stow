import type { NextRequest } from "next/server";

import { publicEnv } from "@/config/public-env";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/config/security-headers";
import { updateSupabaseSession } from "@/server/infrastructure/supabase/proxy";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = await updateSupabaseSession(request, requestHeaders);
  applySecurityHeaders(response, contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
