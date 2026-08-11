import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/config/security-headers";

describe("security headers", () => {
  it("builds a nonce-based production CSP for the Supabase origin", () => {
    const policy = buildContentSecurityPolicy(
      "test-nonce",
      "https://project.supabase.co/path",
      false,
    );

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("connect-src 'self' https://project.supabase.co");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows only the development capabilities required by Next.js", () => {
    const policy = buildContentSecurityPolicy(
      "test-nonce",
      "http://127.0.0.1:54321",
      true,
    );

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("'unsafe-inline'");
    expect(policy).toContain("ws: wss:");
  });

  it("applies the browser security baseline", () => {
    const response = new Response();

    applySecurityHeaders(response, "default-src 'self'");

    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'self'",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});
