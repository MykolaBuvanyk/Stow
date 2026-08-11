import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  STOW_REQUEST_HEADER,
  STOW_REQUEST_HEADER_VALUE,
} from "@/config/http-policy";

vi.mock("server-only", () => ({}));

import { requireSameOrigin } from "@/server/core/http/require-same-origin";

const endpoint = "http://localhost/api/uploads";

function request(headers: HeadersInit = {}) {
  return new NextRequest(endpoint, { method: "POST", headers });
}

describe("requireSameOrigin", () => {
  it("accepts a marked request from the exact origin", () => {
    expect(() =>
      requireSameOrigin(
        request({
          Origin: "http://localhost",
          [STOW_REQUEST_HEADER]: STOW_REQUEST_HEADER_VALUE,
        }),
      ),
    ).not.toThrow();
  });

  it("uses an exact same-origin Referer only as an Origin fallback", () => {
    expect(() =>
      requireSameOrigin(
        request({
          Referer: "http://localhost/files",
          [STOW_REQUEST_HEADER]: STOW_REQUEST_HEADER_VALUE,
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    ["missing source headers", { [STOW_REQUEST_HEADER]: STOW_REQUEST_HEADER_VALUE }],
    ["missing request marker", { Origin: "http://localhost" }],
    [
      "a different origin",
      {
        Origin: "https://attacker.example",
        [STOW_REQUEST_HEADER]: STOW_REQUEST_HEADER_VALUE,
      },
    ],
    [
      "an explicitly cross-site request",
      {
        Origin: "http://localhost",
        "Sec-Fetch-Site": "cross-site",
        [STOW_REQUEST_HEADER]: STOW_REQUEST_HEADER_VALUE,
      },
    ],
  ])("rejects %s", (_name, headers) => {
    expect(() => requireSameOrigin(request(headers))).toThrowError(
      expect.objectContaining({ code: "CROSS_ORIGIN_REQUEST", status: 403 }),
    );
  });
});
