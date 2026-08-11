const BASE_SECURITY_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function buildContentSecurityPolicy(
  nonce: string,
  supabaseUrl: string,
  isDevelopment: boolean,
): string {
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const scriptDevelopmentSources = isDevelopment ? " 'unsafe-eval'" : "";
  const styleDevelopmentSources = isDevelopment ? " 'unsafe-inline'" : "";
  const connectDevelopmentSources = isDevelopment ? " ws: wss:" : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptDevelopmentSources}`,
    `style-src 'self' 'nonce-${nonce}'${styleDevelopmentSources}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}${connectDevelopmentSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function applySecurityHeaders(
  response: Response,
  contentSecurityPolicy: string,
): void {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
}

export const staticSecurityHeaders = Object.entries(BASE_SECURITY_HEADERS).map(
  ([key, value]) => ({ key, value }),
);
