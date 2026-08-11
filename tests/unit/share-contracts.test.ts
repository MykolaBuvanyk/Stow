import { describe, expect, it } from "vitest";

import {
  createShareRequestSchema,
  listSharesResponseSchema,
} from "@/contracts/share.contracts";

describe("share contracts", () => {
  it("normalizes an exact recipient email", () => {
    expect(
      createShareRequestSchema.parse({ email: "  USER@Example.COM  " }),
    ).toEqual({ email: "user@example.com" });
  });

  it("rejects extra owner-controlled identifiers", () => {
    expect(
      createShareRequestSchema.safeParse({
        email: "user@example.com",
        granteeId: "spoofed",
      }).success,
    ).toBe(false);
  });

  it("returns only the recipient fields needed by the owner UI", () => {
    const result = listSharesResponseSchema.parse({
      items: [
        {
          shareId: "11111111-1111-4111-8111-111111111111",
          email: "user@example.com",
          createdAt: "2026-08-11T12:00:00.000Z",
        },
      ],
    });

    expect(result.items[0]).not.toHaveProperty("fileId");
  });
});
