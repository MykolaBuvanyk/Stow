import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/config/server-env", () => ({
  serverEnv: {
    CRON_SECRET: "test-rate-limit-secret-with-at-least-32-characters",
  },
}));

vi.mock("@/server/core/abuse/rate-limit.repository", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

const userId = "11111111-1111-4111-8111-111111111111";

describe("enforceApiRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
  });

  it("checks both the authenticated user and a valid proxy IP", async () => {
    await enforceApiRateLimit(
      new Request("http://localhost/api/uploads", {
        headers: { "x-vercel-forwarded-for": "203.0.113.10" },
      }),
      userId,
      "upload-reserve",
    );

    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "upload-reserve",
      20,
      60,
    );
    expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "upload-reserve",
      40,
      60,
    );
  });

  it("returns 429 with Retry-After when a scope is exhausted", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 17,
    });

    await expect(
      enforceApiRateLimit(
        new Request("http://localhost/api/uploads"),
        userId,
        "upload-reserve",
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
      status: 429,
    });

    try {
      await enforceApiRateLimit(
        new Request("http://localhost/api/uploads"),
        userId,
        "upload-reserve",
      );
    } catch (error) {
      expect(error).toHaveProperty("headers");
      expect((error as { headers: Headers }).headers.get("retry-after")).toBe("17");
    }
  });
});
